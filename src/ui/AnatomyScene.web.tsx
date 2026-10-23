import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import bodypartsManifest from "../data/bodyparts3d-manifest.json";
import { anatomyStructure } from "../data/anatomy-structures";
import type { AnatomySystem } from "../data/anatomy-structures";
import { localizeAnatomyName, anatomyNameHasFrench } from "../data/anatomy-nomenclature";
import { anatomyInspectionResolution, anatomyMeshBounds, createAnatomyProgressiveLod, loadAnatomyLayer, matchingAnatomyMeshes, type AnatomyLodStatus, type BodyPartsManifest, type LoadedAnatomyLayer } from "./anatomy-gltf.web";
import { HumanFigure } from "./anatomy-vector";
import { applyAnatomyTissueProfile } from "./anatomy-materials.web";
import type { AnatomySceneProps } from "./anatomy-scene-types";

export type { AnatomySceneProps } from "./anatomy-scene-types";
const defaultManifest = bodypartsManifest as unknown as BodyPartsManifest;
type MaterialSet = THREE.Material | THREE.Material[];
type CameraFitOptions = { anterior?: boolean; zoom?: number; animate?: boolean; selection?: boolean };
type World = {
  renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; scene: THREE.Scene; controls: OrbitControls;
  bodyPixelRatio: number;
  lod?: ReturnType<typeof createAnatomyProgressiveLod>;
  layers: Map<string, LoadedAnatomyLayer>; loading: Map<string, Promise<LoadedAnatomyLayer>>; controllers: Set<AbortController>;
  requests: Map<string, AbortController>; detailTouched: Map<string, number>; activeDetailKeys: Set<string>;
  detailMode: boolean; bodyCamera?: { position: THREE.Vector3; target: THREE.Vector3 };
  layer?: LoadedAnatomyLayer; activeLayers: LoadedAnatomyLayer[]; render: () => void; present: () => void;
  fit: (bounds: THREE.Box3, options?: CameraFitOptions) => void;
  pruneDetails: () => void;
  settleResolution: () => void;
  fullBounds: () => THREE.Box3;
};

/** Source anatomy meshes only: no procedural body is substituted for the dataset. */
export function AnatomyScene(props: AnatomySceneProps) {
  const manifest = props.sourceManifest ?? defaultManifest;
  const datasetKey = manifest.datasetId ?? manifest.dataset ?? "bodyparts3d-4.0";
  const appearance = props.appearance ?? (manifest.datasetId === "bodyparts3d-3.0-95" ? "natural" : "study");
  const { system, view, selectedId, zoom = 1, height = 580, language = "fr", isolate = false, opacity = 1, hiddenIds = [], resetKey = 0, focusSelectionKey = 0, focusRegionKey = 0, isolatedDetail = false } = props;
  const requiredSystems = [...new Set(props.visibleSystems?.length ? props.visibleSystems : ["skeleton" as AnatomySystem, system])];
  const visibleKey = requiredSystems.slice().sort().join(",");
  const detailSelection = isolatedDetail ? manifest.meshes.filter((entry) => entry.id === selectedId || entry.legacyIds?.includes(selectedId ?? "")) : [];
  const detailKey = detailSelection.map((entry) => entry.id).sort().join(",");
  const host = useRef<HTMLDivElement>(null), tooltip = useRef<HTMLDivElement>(null), orientation = useRef<HTMLDivElement>(null);
  const world = useRef<World | undefined>(undefined), live = useRef(props); live.current = props;
  const previous = useRef<{ view: string; zoom: number; reset: number; focus: number; region: number; system: string } | undefined>(undefined);
  const [contextReady, setContextReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "webgl-error">("loading");
  const [progress, setProgress] = useState(0), [retry, setRetry] = useState(0), [revision, setRevision] = useState(0);
  const [contextAttempt, setContextAttempt] = useState(0);
  const [hoverId, setHoverId] = useState<string | undefined>(undefined), [hoverLabel, setHoverLabel] = useState("");
  const [hoverEnglish, setHoverEnglish] = useState(false);
  const [lodStatus, setLodStatus] = useState<AnatomyLodStatus>({ pending: 0, loaded: 0, errors: 0 });
  const l = (fr: string, en: string) => language === "fr" ? fr : en;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    previous.current = undefined; setStatus("loading"); setLodStatus({ pending: 0, loaded: 0, errors: 0 });
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch { setStatus("webgl-error"); return; }
    const lowPower = matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4;
    const adaptiveResolution = manifest.datasetId === "bodyparts3d-3.0-95";
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    const canvas = renderer.domElement;
    Object.assign(canvas.style, { width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" });
    canvas.dataset.testid = "anatomy-webgl-canvas"; canvas.dataset.sourceId = datasetKey; canvas.dataset.resolutionMode = adaptiveResolution ? "body" : "fixed"; canvas.dataset.resolutionPending = "false"; canvas.tabIndex = 0; canvas.setAttribute("role", "img"); container.appendChild(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.005, 40);
    camera.position.set(0, 0.85, 3.3);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.85, 0); controls.enableDamping = false; controls.autoRotate = false;
    controls.enablePan = true; controls.screenSpacePanning = true; controls.zoomToCursor = true; controls.minDistance = 0.025; controls.maxDistance = 10;
    controls.minPolarAngle = 0.04; controls.maxPolarAngle = Math.PI - 0.04;
    controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.75; controls.panSpeed = 0.8;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    scene.add(new THREE.HemisphereLight(0xeee9e2, 0x292832, 0.5));
    const key = new THREE.DirectionalLight(0xfff3e7, 2.15); key.position.set(-2.6, 2.8, 3.6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdde5ef, 0.55); fill.position.set(2.3, 1.5, 1.5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xe5e9f0, 0.85); rim.position.set(-1.8, 2, -2); scene.add(rim);
    let environment: THREE.WebGLRenderTarget | undefined;
    try {
      const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
      environment = generator.fromScene(room, 0.04, 0.1, 100, { size: lowPower ? 64 : 128 });
      scene.environment = environment.texture; scene.environmentIntensity = 0.45; room.dispose(); generator.dispose();
    } catch { /* Direct lights remain available on GPUs without environment support. */ }
    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
      gradient.addColorStop(0, "rgba(0,0,0,0.48)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas), shadowGeometry = new THREE.PlaneGeometry(0.8, 0.65);
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.002; scene.add(shadow);
    const outlines = new THREE.Group(); scene.add(outlines);
    const outlineMaterial = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color("#b6ed29") }, width: { value: 1.25 }, viewport: { value: new THREE.Vector2(380, 580) } },
      // A screen-space shell keeps its width in CSS pixels despite the source
      // quantisation scale, camera distance and adaptive drawing-buffer DPR.
      vertexShader: `uniform float width; uniform vec2 viewport;
        void main(){
          vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          vec4 n=projectionMatrix*vec4(normalize(normalMatrix*normal),0.0);
          vec2 direction=(n.xy*clip.w-clip.xy*n.w)*viewport;
          direction/=max(length(direction),0.000001);
          clip.xy+=direction*(2.0*width/viewport)*clip.w;
          gl_Position=clip;
        }`,
      fragmentShader: "uniform vec3 color; void main(){gl_FragColor=vec4(color,1.0);\n#include <colorspace_fragment>\n}", side: THREE.BackSide, depthWrite: false, toneMapped: false,
    });
    const originals = new Map<THREE.Mesh, MaterialSet>();
    const faded = new Map<THREE.Material, THREE.Material>(), selectedMaterials = new Map<THREE.Material, THREE.Material>(), hoverMaterials = new Map<THREE.Material, THREE.Material>();
    let frame = 0, motion = 0, lastFrame = 0, disposed = false, hovered: string | undefined;
    let resolutionTimer: ReturnType<typeof setTimeout> | undefined, interacting = false;
    let fittedFrame: { bounds: THREE.Box3; options: CameraFitOptions } | undefined;
    const fullBounds = () => {
      if (value.detailMode && value.activeLayers.length) {
        const bounds = new THREE.Box3(); value.activeLayers.forEach((layer) => bounds.union(layer.bounds)); return bounds;
      }
      const bounds = manifest.bounds;
      if (bounds?.min.length === 3 && bounds.max.length === 3 && bounds.max[1]! > bounds.min[1]!) return new THREE.Box3(new THREE.Vector3(...bounds.min as [number, number, number]), new THREE.Vector3(...bounds.max as [number, number, number]));
      return value.layer?.bounds.clone() ?? new THREE.Box3(new THREE.Vector3(-0.45, 0, -0.2), new THREE.Vector3(0.45, 1.8, 0.2));
    };
    const render = () => {
      if (disposed || frame) return;
      const draw = (at: number) => {
        if (lowPower && at - lastFrame < 32) { frame = requestAnimationFrame(draw); return; }
        frame = 0;
        if (disposed) return;
        if (renderer.getContext().isContextLost()) { setStatus("webgl-error"); return; }
        lastFrame = at;
        renderer.render(scene, camera);
        canvas.dataset.pixelRatio = String(renderer.getPixelRatio()); canvas.dataset.bufferPixels = String(canvas.width * canvas.height);
        canvas.dataset.camera = [camera.position.x, camera.position.y, camera.position.z, controls.target.x, controls.target.y, controls.target.z].map((n) => n.toFixed(5)).join(",");
        canvas.dataset.drawCalls = String(renderer.info.render.calls); canvas.dataset.triangles = String(renderer.info.render.triangles);
        const selected = value.activeLayers.flatMap((layer) => matchingAnatomyMeshes(layer, live.current.selectedId)).filter((mesh) => mesh.visible);
        if (selected.length) {
          const center = anatomyMeshBounds(selected).getCenter(new THREE.Vector3()).project(camera);
          canvas.dataset.selectionProjection = JSON.stringify({ x: (center.x + 1) / 2, y: (1 - center.y) / 2, inView: Math.abs(center.x) < 1 && Math.abs(center.y) < 1 && center.z < 1 });
        } else delete canvas.dataset.selectionProjection;
        if (orientation.current) {
          const delta = camera.position.clone().sub(controls.target), fr = live.current.language !== "en";
          orientation.current.textContent = Math.abs(delta.x) > Math.abs(delta.z) ? delta.x > 0 ? fr ? "G" : "L" : fr ? "D" : "R" : delta.z > 0 ? fr ? "AV" : "ANT" : fr ? "AR" : "POST";
        }
      };
      frame = requestAnimationFrame(draw);
    };
    const updateResolution = (moving: boolean) => {
      if (!adaptiveResolution || disposed || renderer.getContext().isContextLost()) return;
      const resolution = anatomyInspectionResolution({
        width: container.clientWidth || 380, height: container.clientHeight || 580,
        devicePixelRatio: window.devicePixelRatio || 1, bodyPixelRatio: value.bodyPixelRatio,
        viewHeight: 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
        bodyHeight: fullBounds().getSize(new THREE.Vector3()).y, moving, lowPower,
      });
      canvas.dataset.resolutionMode = resolution.mode; canvas.dataset.pixelBudget = String(resolution.pixelBudget);
      if (Math.abs(renderer.getPixelRatio() - resolution.ratio) > 0.001) { renderer.setPixelRatio(resolution.ratio); render(); }
    };
    const settleResolution = () => {
      if (!adaptiveResolution || disposed) return;
      if (resolutionTimer) clearTimeout(resolutionTimer);
      updateResolution(true); canvas.dataset.resolutionPending = "true";
      if (!interacting) resolutionTimer = setTimeout(() => {
        resolutionTimer = undefined; canvas.dataset.resolutionPending = "false"; updateResolution(false);
      }, 220);
    };
    const materialFor = (base: THREE.Material, style: "selected" | "hover" | "faded", alpha: number) => {
      const cache = style === "selected" ? selectedMaterials : style === "hover" ? hoverMaterials : faded;
      let material = cache.get(base);
      if (!material) { material = base.clone(); cache.set(base, material); }
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
        material.color.copy((base as THREE.MeshStandardMaterial).color);
        if (style === "hover") material.color.lerp(new THREE.Color("#e5dcf2"), 0.08);
      }
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = (base as THREE.MeshStandardMaterial).roughness; material.envMapIntensity = (base as THREE.MeshStandardMaterial).envMapIntensity;
        material.emissive.set(0x000000); material.emissiveIntensity = 0;
      }
      material.opacity = style === "faded" ? base.opacity * alpha : 1; material.transparent = material.opacity < 1; material.depthWrite = material.opacity >= 0.6;
      return material;
    };
    const present = () => {
      const meshes = value.activeLayers.flatMap((layer) => layer.meshes);
      outlines.clear(); shadow.visible = !value.detailMode;
      canvas.dataset.selectedId = live.current.selectedId ?? "";
      canvas.dataset.detailMode = String(value.detailMode);
      canvas.dataset.meshCount = "0";
      if (!meshes.length) { render(); return; }
      const current = live.current, selected = new Set(value.activeLayers.flatMap((layer) => matchingAnatomyMeshes(layer, current.selectedId))), hidden = new Set(value.detailMode ? [] : current.hiddenIds ?? []);
      const currentAppearance = current.appearance ?? (manifest.datasetId === "bodyparts3d-3.0-95" ? "natural" : "study");
      canvas.dataset.appearance = currentAppearance; canvas.dataset.materialModel = "standard-pbr"; canvas.dataset.outlineWidth = String(outlineMaterial.uniforms.width!.value);
      const tissueProfiles = new Set<string>(), selectedColors = new Set<string>();
      const alpha = !value.detailMode && Number.isFinite(current.opacity) ? THREE.MathUtils.clamp(current.opacity!, 0.08, 1) : 1;
      meshes.forEach((mesh) => {
        const id = mesh.userData.structureId as string, aliases = mesh.userData.legacyIds as readonly string[], chosen = selected.has(mesh);
        mesh.visible = !hidden.has(id) && !aliases.some((alias) => hidden.has(alias))
          && (value.detailMode || !current.isolate || !selected.size || chosen) && (!mesh.userData.contextEnvelope || chosen);
        if (!originals.has(mesh)) originals.set(mesh, mesh.material);
        const base = originals.get(mesh)!;
        const entry = value.activeLayers.find((layer) => layer.entries.has(id))?.entries.get(id);
        (Array.isArray(base) ? base : [base]).forEach((material) => {
          if (entry) applyAnatomyTissueProfile(material, entry, currentAppearance);
          if (mesh.visible && material.userData.anatomyTissue) tissueProfiles.add(material.userData.anatomyTissue as string);
          if (chosen && mesh.visible && material instanceof THREE.MeshStandardMaterial) selectedColors.add(material.color.getHexString());
        });
        // The isolated inspection already contains only the chosen anatomy;
        // retain its natural tissue colour so light reveals the real relief.
        const style = chosen && !value.detailMode ? "selected" : hovered === id ? "hover" : alpha < 1 ? "faded" : undefined;
        mesh.material = style ? Array.isArray(base) ? base.map((mat) => materialFor(mat, style, alpha)) : materialFor(base, style, alpha) : base;
        if (chosen && mesh.visible) {
          const shell = new THREE.Mesh(mesh.geometry, outlineMaterial); shell.matrixAutoUpdate = false; shell.matrix.copy(mesh.matrixWorld); outlines.add(shell);
        }
      });
      canvas.dataset.tissueProfiles = [...tissueProfiles].sort().join(","); canvas.dataset.selectedMaterialColor = [...selectedColors].sort().join(",");
      canvas.dataset.selectedId = current.selectedId ?? ""; canvas.dataset.meshCount = String(meshes.filter((mesh) => mesh.visible).length); render();
    };
    const fit = (bounds: THREE.Box3, options: CameraFitOptions = {}) => {
      if (bounds.isEmpty()) return;
      if (adaptiveResolution) fittedFrame = { bounds: bounds.clone(), options: { ...options } };
      cancelAnimationFrame(motion);
      const target = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3()), tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      if (options.selection) {
        const minimum = live.current.isolate || value.detailMode ? 0.18 : 0.3;
        size.x = Math.max(size.x, minimum); size.y = Math.max(size.y, minimum); size.z = Math.max(size.z, 0.05);
      }
      const distance = Math.max(size.y / (2 * tangent), size.x / (2 * tangent * Math.max(0.25, camera.aspect))) + size.z / 2;
      const radius = THREE.MathUtils.clamp(distance * 1.2 / (options.zoom ?? 1), controls.minDistance * 2, controls.maxDistance);
      const direction = options.anterior === undefined ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(0, 0, options.anterior ? 1 : -1);
      const position = target.clone().addScaledVector(direction, radius);
      if (!options.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) { controls.target.copy(target); camera.position.copy(position); controls.update(); render(); return; }
      const fromPosition = camera.position.clone(), fromTarget = controls.target.clone(), started = performance.now();
      const animate = (at: number) => {
        if (disposed) return;
        const t = Math.min(1, (at - started) / 240), ease = 1 - (1 - t) ** 3;
        camera.position.lerpVectors(fromPosition, position, ease); controls.target.lerpVectors(fromTarget, target, ease); controls.update(); render();
        if (t < 1) motion = requestAnimationFrame(animate);
      };
      motion = requestAnimationFrame(animate);
    };
    const releaseLayer = (layer: LoadedAnatomyLayer) => {
      const bases = new Set<THREE.Material>();
      layer.meshes.forEach((mesh) => {
        const original = originals.get(mesh);
        if (original) mesh.material = original;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => bases.add(material));
        originals.delete(mesh);
      });
      [faded, selectedMaterials, hoverMaterials].forEach((cache) => bases.forEach((base) => { cache.get(base)?.dispose(); cache.delete(base); }));
      layer.group.removeFromParent(); layer.dispose();
    };
    const pruneDetails = () => {
      const inactive = [...value.detailTouched.entries()].filter(([key]) => !value.activeDetailKeys.has(key)).sort((a, b) => a[1] - b[1]);
      for (const [key] of inactive.slice(0, Math.max(0, inactive.length - 12))) {
        const layer = value.layers.get(key);
        if (layer) {
          releaseLayer(layer); value.layers.delete(key);
        }
        value.detailTouched.delete(key);
      }
    };
    const value: World = { renderer, bodyPixelRatio: renderer.getPixelRatio(), scene, camera, controls, layers: new Map(), activeLayers: [], loading: new Map(), controllers: new Set(), requests: new Map(), detailTouched: new Map(), activeDetailKeys: new Set(), detailMode: false, render, present, fit, fullBounds, pruneDetails, settleResolution };
    if (manifest.meshes.some((entry) => entry.lod)) value.lod = createAnatomyProgressiveLod({
      manifest, camera, canvas, lowPower, getLayers: () => value.activeLayers, getSelectedId: () => live.current.selectedId,
      enabled: () => !value.detailMode && value.activeLayers.length > 0, changed: present, status: setLodStatus, disposeLayer: releaseLayer,
    });
    const cameraChange = () => { settleResolution(); render(); value.lod?.schedule(); };
    world.current = value; controls.addEventListener("change", cameraChange);
    const stopMotion = () => { fittedFrame = undefined; interacting = true; settleResolution(); cancelAnimationFrame(motion); value.lod?.pause(); canvas.style.cursor = "grabbing"; };
    const stopDrag = () => { interacting = false; settleResolution(); value.lod?.resume(); canvas.style.cursor = hovered ? "pointer" : "grab"; };
    controls.addEventListener("start", stopMotion); controls.addEventListener("end", stopDrag);
    const resize = () => {
      const width = container.clientWidth || 380, h = container.clientHeight || 580;
      (outlineMaterial.uniforms.viewport!.value as THREE.Vector2).set(width, h);
      renderer.setSize(width, h, false); camera.aspect = width / h; camera.updateProjectionMatrix();
      if (fittedFrame) fit(fittedFrame.bounds, { ...fittedFrame.options, animate: false });
      settleResolution(); render(); value.lod?.schedule();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const pick = (x: number, y: number) => {
      if (!value.activeLayers.length) return undefined;
      const rect = canvas.getBoundingClientRect(); pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(value.activeLayers.flatMap((layer) => layer.meshes.filter((mesh) => mesh.visible)), false)[0]?.object as THREE.Mesh | undefined;
    };
    const clearHover = () => { hovered = undefined; setHoverId(undefined); delete canvas.dataset.hoverId; canvas.style.cursor = "grab"; present(); };
    const activePointers = new Set<number>();
    let down: { x: number; y: number; id: number } | undefined, multiTouch = false, hoverAt = 0;
    let lastTouch: { at: number; id: string; x: number; y: number } | undefined;
    const pointerDown = (event: PointerEvent) => {
      activePointers.add(event.pointerId); if (activePointers.size > 1) multiTouch = true;
      else { down = { x: event.clientX, y: event.clientY, id: event.pointerId }; multiTouch = false; } clearHover();
    };
    const pointerMove = (event: PointerEvent) => {
      if (activePointers.size || event.pointerType === "touch" || performance.now() - hoverAt < 42) return;
      hoverAt = performance.now(); const mesh = pick(event.clientX, event.clientY), id = mesh?.userData.structureId as string | undefined;
      if (id !== hovered) {
        hovered = id; setHoverId(id); canvas.dataset.hoverId = id ?? "";
        const item = id ? value.activeLayers.find((layer) => layer.byId.has(id))?.entries.get(id) : undefined;
        if (item) { const lang = live.current.language ?? "fr"; setHoverLabel(localizeAnatomyName(item.name, lang)); setHoverEnglish(lang === "fr" && !anatomyNameHasFrench(item.name)); }
        canvas.style.cursor = id ? "pointer" : "grab"; present();
      }
      if (tooltip.current && id) {
        const rect = container.getBoundingClientRect(); tooltip.current.style.left = `${Math.max(10, Math.min(rect.width - 225, event.clientX - rect.left + 15))}px`; tooltip.current.style.top = `${Math.max(12, event.clientY - rect.top - 48)}px`;
      }
    };
    const pointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      if (multiTouch || !down || event.pointerId !== down.id || event.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) return;
      const mesh = pick(event.clientX, event.clientY), id = mesh?.userData.structureId as string | undefined;
      if (id) {
        live.current.onSelect?.(id);
        if (event.pointerType === "touch") {
          if (lastTouch && lastTouch.id === id && performance.now() - lastTouch.at < 350 && Math.hypot(lastTouch.x - event.clientX, lastTouch.y - event.clientY) < 20) { fit(anatomyMeshBounds(value.activeLayers.flatMap((layer) => layer.byId.get(id) ?? [])), { animate: true, selection: true }); lastTouch = undefined; }
          else lastTouch = { at: performance.now(), id, x: event.clientX, y: event.clientY };
        }
      }
      down = undefined;
    };
    const pointerCancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); down = undefined; };
    const doubleClick = (event: MouseEvent) => {
      const mesh = pick(event.clientX, event.clientY), id = mesh?.userData.structureId as string | undefined;
      if (id) { live.current.onSelect?.(id); fit(anatomyMeshBounds(value.activeLayers.flatMap((layer) => layer.byId.get(id) ?? [])), { animate: true, selection: true }); }
    };
    const keyboard = (event: KeyboardEvent) => {
      const sphere = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if (event.key === "ArrowLeft") sphere.theta -= 0.15; else if (event.key === "ArrowRight") sphere.theta += 0.15;
      else if (event.key === "ArrowUp") sphere.phi = Math.max(0.04, sphere.phi - 0.12); else if (event.key === "ArrowDown") sphere.phi = Math.min(Math.PI - 0.04, sphere.phi + 0.12);
      else if (event.key === "+" || event.key === "=") sphere.radius = Math.max(controls.minDistance, sphere.radius * 0.85); else if (event.key === "-") sphere.radius = Math.min(controls.maxDistance, sphere.radius / 0.85);
      else if (event.key.toLowerCase() === "r") { event.preventDefault(); fit(fullBounds(), { anterior: true }); return; }
      else if (event.key.toLowerCase() === "f" && value.activeLayers.length) { event.preventDefault(); fit(anatomyMeshBounds(value.activeLayers.flatMap((layer) => matchingAnatomyMeshes(layer, live.current.selectedId))), { animate: true, selection: true }); return; }
      else return;
      event.preventDefault(); fittedFrame = undefined; cancelAnimationFrame(motion); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere)); controls.update(); render();
    };
    const contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(motion); setStatus("webgl-error"); };
    canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove); canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("pointerleave", clearHover); canvas.addEventListener("dblclick", doubleClick); canvas.addEventListener("keydown", keyboard); canvas.addEventListener("webglcontextlost", contextLost);
    setContextReady(true);
    return () => {
      disposed = true; if (resolutionTimer) clearTimeout(resolutionTimer); value.lod?.dispose(); cancelAnimationFrame(frame); cancelAnimationFrame(motion); observer.disconnect(); controls.removeEventListener("change", cameraChange); controls.removeEventListener("start", stopMotion); controls.removeEventListener("end", stopDrag); controls.dispose();
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("pointerleave", clearHover); canvas.removeEventListener("dblclick", doubleClick); canvas.removeEventListener("keydown", keyboard); canvas.removeEventListener("webglcontextlost", contextLost);
      value.controllers.forEach((controller) => controller.abort()); originals.forEach((material, mesh) => { mesh.material = material; }); value.layers.forEach((layer) => layer.dispose());
      [faded, selectedMaterials, hoverMaterials].forEach((cache) => cache.forEach((material) => material.dispose())); outlines.clear(); outlineMaterial.dispose(); shadowGeometry.dispose(); shadowMaterial.dispose(); shadowTexture.dispose(); environment?.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); if (world.current === value) world.current = undefined;
    };
  }, [contextAttempt, datasetKey]);

  useEffect(() => {
    const current = world.current;
    if (!current || !contextReady || current.renderer.getContext().isContextLost()) return;
    let active = true;
    if (isolatedDetail && !current.detailMode && !current.bodyCamera) current.bodyCamera = { position: current.camera.position.clone(), target: current.controls.target.clone() };
    current.detailMode = isolatedDetail;
    // A few isolated surfaces can use a sharper buffer than the dense body.
    const pixelRatio = isolatedDetail ? Math.min(window.devicePixelRatio || 1, 2) : current.bodyPixelRatio;
    if (current.renderer.getPixelRatio() !== pixelRatio) current.renderer.setPixelRatio(pixelRatio);
    const detailEntries = detailSelection.map((entry) => ({ entry, detail: manifest.isolatedDetails?.entries.find((detail) => detail.id === entry.id) }));
    const work = isolatedDetail
      ? detailEntries.filter((item) => !!item.detail).map(({ entry, detail }) => ({
        key: `detail:${entry.id}`, system: entry.system, bytes: detail!.bytes,
        source: { ...manifest, meshes: [entry], systems: [{ id: entry.system, url: detail!.url, bytes: detail!.bytes }] } as BodyPartsManifest,
      }))
      : requiredSystems.map((id) => ({ key: id, system: id, bytes: manifest.systems.find((entry) => entry.id === id)?.bytes ?? 0, source: manifest }));
    current.activeDetailKeys = new Set(isolatedDetail ? work.map((item) => item.key) : []);
    // Changing the inspected structure cancels obsolete network/decode work,
    // while complete base layers stay cached for returning to the body.
    current.requests.forEach((controller, key) => { if (key.startsWith("detail:") && !current.activeDetailKeys.has(key)) controller.abort(); });
    current.layers.forEach((layer) => { layer.group.visible = false; }); current.layer = undefined; current.activeLayers = []; current.present(); setHoverId(undefined); setStatus("loading"); setProgress(0);
    current.pruneDetails();
    if (isolatedDetail && (!detailEntries.length || detailEntries.some((item) => !item.detail))) { setStatus("error"); return () => { active = false; }; }
    const activate = (layers: LoadedAnatomyLayer[]) => {
      if (!active || world.current !== current || current.renderer.getContext().isContextLost()) return;
      current.activeLayers = layers; current.layer = layers.find((layer) => layer.system === system) ?? layers[0];
      layers.forEach((layer) => { layer.group.visible = true; }); current.present();
      if (isolatedDetail) current.fit(current.fullBounds(), { anterior: live.current.view === "anterior", selection: true });
      else if (current.bodyCamera) {
        current.camera.position.copy(current.bodyCamera.position); current.controls.target.copy(current.bodyCamera.target);
        current.controls.update(); current.render(); current.bodyCamera = undefined;
      } else if (!previous.current) current.fit(current.fullBounds(), { anterior: live.current.view === "anterior", zoom: live.current.zoom ?? 1 });
      current.pruneDetails();
      current.lod?.schedule();
      current.settleResolution();
      setStatus("ready"); setRevision((n) => n + 1); live.current.onReady?.({ meshCount: layers.reduce((count, layer) => count + layer.meshes.length, 0), structureIds: [...new Set(layers.flatMap((layer) => [...layer.byId.keys()]))] });
    };
    const loadedBytes = new Map<string, number>();
    let lastProgressUpdate = 0;
    const totalBytes = work.reduce((total, item) => total + item.bytes, 0);
    const promises = work.map(({ key, system: layerSystem, bytes, source }) => {
      const cached = current.layers.get(key);
      if (cached) { loadedBytes.set(key, bytes); if (isolatedDetail) current.detailTouched.set(key, performance.now()); return Promise.resolve(cached); }
      let promise = current.requests.get(key)?.signal.aborted ? undefined : current.loading.get(key);
      if (!promise) {
        const controller = new AbortController(); current.controllers.add(controller); current.requests.set(key, controller);
        const request = loadAnatomyLayer(source, layerSystem, controller.signal, (loaded) => {
          loadedBytes.set(key, loaded);
          if (active && world.current === current && performance.now() - lastProgressUpdate > 80) {
            lastProgressUpdate = performance.now();
            setProgress(totalBytes > 0 ? Math.min(99, Math.round([...loadedBytes.values()].reduce((a, b) => a + b, 0) / totalBytes * 100)) : 0);
          }
        }).then((layer) => {
          if (world.current !== current || controller.signal.aborted) { layer.dispose(); throw new DOMException("Aborted", "AbortError"); }
          layer.group.visible = false; current.scene.add(layer.group); current.layers.set(key, layer);
          if (key.startsWith("detail:")) current.detailTouched.set(key, performance.now());
          return layer;
        }).finally(() => {
          current.controllers.delete(controller);
          if (current.requests.get(key) === controller) { current.requests.delete(key); current.loading.delete(key); }
        });
        promise = request; current.loading.set(key, promise);
      }
      return promise;
    });
    void Promise.all(promises).then(activate).catch(() => { if (active && world.current === current) setStatus(current.renderer.getContext().isContextLost() ? "webgl-error" : "error"); });
    return () => { active = false; };
  // Changing the primary palette after clicking another visible system must
  // preserve the camera and the loaded spatial workspace.
  }, [datasetKey, visibleKey, isolatedDetail, detailKey, contextReady, retry, contextAttempt]);

  useEffect(() => { world.current?.present(); world.current?.lod?.schedule(); }, [selectedId, isolate, opacity, hiddenIds, appearance, revision]);
  useEffect(() => {
    const current = world.current;
    if (!current?.layer || status !== "ready") return;
    const safeZoom = Number.isFinite(zoom) ? THREE.MathUtils.clamp(zoom, 1, 4) : 1, before = previous.current;
    previous.current = { view, zoom: safeZoom, reset: resetKey, focus: focusSelectionKey, region: focusRegionKey, system };
    const selection = current.activeLayers.flatMap((layer) => matchingAnatomyMeshes(layer, selectedId));
    const region = props.focusRegionBounds;
    if (region && (!before || before.region !== focusRegionKey) && region.min.length === 3 && region.max.length === 3 && [...region.min, ...region.max].every(Number.isFinite)) {
      const bounds = new THREE.Box3(new THREE.Vector3(...region.min as [number, number, number]), new THREE.Vector3(...region.max as [number, number, number]));
      if (!bounds.isEmpty()) { current.fit(bounds, { animate: true }); return; }
    }
    if (before && before.focus !== focusSelectionKey && selection.length) { current.fit(anatomyMeshBounds(selection), { animate: true, selection: true }); return; }
    const changed = !before || before.view !== view || before.zoom !== safeZoom || before.reset !== resetKey;
    if (!changed) return;
    if (safeZoom > 1.01 && selection.length) {
      const size = current.fullBounds().getSize(new THREE.Vector3()), center = anatomyMeshBounds(selection).getCenter(new THREE.Vector3());
      current.fit(new THREE.Box3(center.clone().addScaledVector(size, -0.5), center.clone().addScaledVector(size, 0.5)), { anterior: view === "anterior", zoom: safeZoom });
    } else current.fit(current.fullBounds(), { anterior: view === "anterior", zoom: safeZoom });
  }, [view, zoom, resetKey, focusSelectionKey, focusRegionKey, system, revision, status]);
  useEffect(() => {
    world.current?.renderer.domElement.setAttribute("aria-label", l("Atlas anatomique 3D BodyParts3D. Glissez pour tourner. Molette : zoom vers le pointeur. Clic droit ou deux doigts : déplacer. Double-cliquez pour cadrer une structure. Flèches : rotation, plus et moins : zoom, F : cadrer, R : réinitialiser.", "BodyParts3D 3D anatomy atlas. Drag to rotate. Scroll to zoom towards the pointer. Right-drag or use two fingers to pan. Double-click to frame a structure. Arrows rotate, plus and minus zoom, F frames, R resets."));
  }, [language, contextReady]);

  const error = status === "error" || status === "webgl-error";
  const fallbackId = anatomyStructure(selectedId ?? "")?.id ?? manifest.meshes.find((entry) => entry.id === selectedId)?.legacyIds?.find((id) => !!anatomyStructure(id));
  const attributionUrl = manifest.attributionUrl ?? (manifest.datasetId === "bodyparts3d-3.0-95" ? "/anatomy/bodyparts3d-complete/ATTRIBUTION.txt" : "/anatomy/bodyparts3d/ATTRIBUTION.txt");
  return <div data-testid="anatomy-3d-scene" data-ready={status === "ready" ? "true" : "false"} data-selected-id={selectedId ?? ""} data-source="BodyParts3D" data-source-id={datasetKey}
    data-detail-mode={isolatedDetail ? "true" : "false"} data-detail-ready={isolatedDetail && status === "ready" ? "true" : "false"}
    style={{ position: "relative", height, minHeight: Math.min(320, height), width: "100%", overflow: "hidden", background: "radial-gradient(ellipse at 48% 38%, #2b3039 0%, #1b1e26 54%, #111219 100%)" }}>
    <div ref={host} style={{ width: "100%", height: "100%", visibility: error ? "hidden" : "visible" }} />
    {status === "loading" && <div role="status" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", background: "#191321d9", color: "#e1d7ee", font: "13px system-ui" }}>
      <div>{isolatedDetail ? l("Chargement du détail anatomique…", "Loading the detailed anatomy…") : l("Chargement des maillages anatomiques…", "Loading anatomical meshes…")}</div><div role="progressbar" aria-label={l("Chargement du modèle anatomique", "Loading the anatomy model")} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ width: 160, height: 3, borderRadius: 4, background: "#493b5b", overflow: "hidden" }}><div style={{ width: `${Math.max(3, progress)}%`, height: "100%", background: "#b4ec28" }} /></div><div style={{ color: "#ac9bbc", fontSize: 11 }}>{progress > 0 ? `${progress}%` : isolatedDetail ? "BodyParts3D 3.0" : "BodyParts3D"}</div>
    </div>}
    {error && <div data-testid="anatomy-webgl-fallback" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 14 }}>
      <div role="alert" style={{ color: "#e1d7ee", font: "12px/19px system-ui", textAlign: "center", maxWidth: 400, margin: "0 auto 12px" }}>{status === "webgl-error" ? l("La 3D est indisponible sur cet appareil. Le schéma 2D reste accessible.", "3D is unavailable on this device. The 2D diagram remains available.") : l("Le modèle anatomique n’a pas pu être chargé. Vérifiez votre connexion ou réessayez.", "The anatomy model could not be loaded. Check your connection or try again.")}</div>
      <button type="button" onClick={() => {
        if (status === "webgl-error") { setStatus("loading"); setContextAttempt((n) => n + 1); }
        else setRetry((n) => n + 1);
      }} style={{ display: "block", margin: "0 auto 12px", border: "1px solid #8f79ac", background: "#342642", color: "#fff", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>{l("Réessayer la 3D", "Retry 3D")}</button>
      {fallbackId ? <View style={{ backgroundColor: "#f3f6f1", borderRadius: 10 }}><HumanFigure system={anatomyStructure(fallbackId)!.system} view={view} selectedId={fallbackId} onSelect={live.current.onSelect} zoom={zoom} height={Math.max(100, height - 110)} language={language} targetOnly={isolate} /></View> : <Text style={{ color: "#bfaed1", fontSize: 12, textAlign: "center", paddingTop: 20 }}>{l("Choisissez la vue 2D pour consulter les schémas disponibles.", "Choose the 2D view to see the available diagrams.")}</Text>}
    </div>}
    {status === "ready" && <>
      {isolatedDetail && <div data-testid="anatomy-detail-badge" style={{ pointerEvents: "none", position: "absolute", top: 15, left: 12, maxWidth: "calc(100% - 80px)", padding: "7px 10px", borderRadius: 8, background: "#21162cdb", border: "1px solid #756087", color: "#e3d8eb", font: "11px/16px system-ui" }}>{l("Vue isolée détaillée", "Detailed isolated view")} · BodyParts3D 3.0</div>}
      {!isolatedDetail && (lodStatus.pending > 0 || lodStatus.errors > 0) && <div data-testid="anatomy-progressive-detail-status" role="status" style={{ position: "absolute", top: 15, left: 12, maxWidth: "calc(100% - 80px)", padding: "7px 10px", borderRadius: 8, background: "#21162cdb", border: "1px solid #756087", color: "#e3d8eb", font: "11px/16px system-ui" }}>
        {lodStatus.pending > 0 ? l("Chargement des détails de la région…", "Loading regional details…") : <>{l("Certains détails sont indisponibles.", "Some details are unavailable.")} <button type="button" onClick={() => world.current?.lod?.retry()} style={{ color: "#d4f48a", background: "none", border: 0, padding: "2px 4px", cursor: "pointer", textDecoration: "underline", font: "inherit" }}>{l("Réessayer", "Retry")}</button></>}
      </div>}
      <div ref={orientation} aria-hidden="true" style={{ pointerEvents: "none", position: "absolute", right: 15, top: 15, border: "1px solid #7c6b91", borderRadius: 24, width: 38, height: 38, display: "grid", placeItems: "center", color: "#c5b4da", font: "600 10px system-ui" }}>{view === "anterior" ? "AV" : "AR"}</div>
      <div ref={tooltip} role="status" style={{ pointerEvents: "none", position: "absolute", left: 12, top: 12, visibility: hoverId ? "visible" : "hidden", maxWidth: 215, background: "#f2ecfa", border: "1px solid #d4c0ec", borderRadius: 9, padding: "9px 12px", boxShadow: "0 5px 18px #0004", color: "#2d1942", font: "600 12px/17px system-ui", zIndex: 2 }}>{hoverLabel}{hoverEnglish && <div style={{ color: "#786885", fontWeight: 400, fontSize: 10 }}>{l("Nom source (anglais)", "Source name (English)")}</div>}</div>
      <div style={{ pointerEvents: "none", position: "absolute", bottom: 33, left: 12, right: 12, color: "#b9a8c9", font: "10px/16px system-ui", textAlign: "center" }}>{l("Glisser : tourner · molette/pincer : zoomer · clic droit/deux doigts : déplacer", "Drag: rotate · scroll/pinch: zoom · right-drag/two fingers: pan")}</div>
    </>}
    <a href={attributionUrl} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", bottom: 10, left: 12, right: 12, color: "#9e8aaf", font: "9px/13px system-ui", textAlign: "center", textDecoration: "none" }}>BodyParts3D {isolatedDetail || manifest.datasetId === "bodyparts3d-3.0-95" ? "3.0" : "/ Anatomography"} © DBCLS · {l("Sources et licences", "Sources and licenses")}</a>
  </div>;
}
