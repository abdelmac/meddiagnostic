import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildAnatomyModel, type AnatomyModel } from "../data/anatomy-3d";
import { HumanFigure } from "./anatomy-vector";
import type { AnatomySceneProps } from "./anatomy-scene-types";

export type { AnatomySceneProps } from "./anatomy-scene-types";

type World = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  controls: OrbitControls;
  model?: AnatomyModel;
  render: () => void;
};

/** True volumetric WebGL: no external models, tracking, animation loop or CDN. */
export function AnatomyScene({
  system, view, selectedId, onSelect, zoom = 1, height = 580,
  language = "fr", isolate = false, opacity = 1, showAttachments = false, resetKey = 0,
}: AnatomySceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | undefined>(undefined);
  const preset = useRef<{ view: string; zoom: number; system: string; resetKey: number } | undefined>(undefined);
  const onSelectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  onSelectRef.current = onSelect;
  const l = (fr: string, en: string) => language === "fr" ? fr : en;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setFailed(true); return;
    }
    const lowPower = window.matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.26;
    const canvas = renderer.domElement;
    canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
    canvas.style.touchAction = "none";
    canvas.dataset.testid = "anatomy-webgl-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
    camera.position.set(0, 3.65, 10.8);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 3.65, 0);
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.enablePan = true;
    controls.minDistance = 1.1; controls.maxDistance = 15;
    controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI - 0.12;
    controls.rotateSpeed = 0.75; controls.zoomSpeed = 0.7;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    const ambient = new THREE.HemisphereLight(0xe8f2e7, 0x405a59, 2.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffebd4, 3.1); key.position.set(-3, 8, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbbdcdf, 2); fill.position.set(5, 4, -3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xe6bb92, 1); rim.position.set(-3, 3, -4); scene.add(rim);
    // Quiet reference rings make camera movement legible without a distracting grid.
    const floorGeometry = new THREE.RingGeometry(0.8, 0.808, 64);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x86aaa4, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.015; scene.add(floor);
    const render = () => { if (!renderer.getContext().isContextLost()) renderer.render(scene, camera); };
    const value: World = { renderer, scene, camera, controls, render };
    world.current = value;
    controls.addEventListener("change", render);
    container.appendChild(canvas);
    const resize = () => {
      const width = container.clientWidth || 380, h = container.clientHeight || 580;
      renderer.setSize(width, h, false); camera.aspect = width / h; camera.updateProjectionMatrix(); render();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
    let down: { x: number; y: number; id: number } | undefined;
    let secondaryGesture = false;
    const activePointers = new Set<number>();
    const pointerDown = (event: PointerEvent) => {
      activePointers.add(event.pointerId);
      if (activePointers.size > 1) secondaryGesture = true;
      if (activePointers.size === 1) { down = { x: event.clientX, y: event.clientY, id: event.pointerId }; secondaryGesture = false; }
    };
    const pointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      if (secondaryGesture || !down || event.pointerId !== down.id || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7 || event.button !== 0) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const targets = Array.from(value.model?.structures.values() ?? []).flat().filter((mesh) => mesh.visible);
      const hit = raycaster.intersectObjects(targets, false)[0];
      const id = hit?.object.userData.structureId as string | undefined;
      if (id) onSelectRef.current?.(id);
      down = undefined;
    };
    const pointerCancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); down = undefined; };
    const keyboard = (event: KeyboardEvent) => {
      const offset = camera.position.clone().sub(controls.target);
      const sphere = new THREE.Spherical().setFromVector3(offset);
      if (event.key === "ArrowLeft") sphere.theta -= 0.15;
      else if (event.key === "ArrowRight") sphere.theta += 0.15;
      else if (event.key === "ArrowUp") sphere.phi = Math.max(0.12, sphere.phi - 0.12);
      else if (event.key === "ArrowDown") sphere.phi = Math.min(Math.PI - 0.12, sphere.phi + 0.12);
      else if (event.key === "+" || event.key === "=") sphere.radius = Math.max(controls.minDistance, sphere.radius * 0.85);
      else if (event.key === "-") sphere.radius = Math.min(controls.maxDistance, sphere.radius / 0.85);
      else return;
      event.preventDefault(); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere)); controls.update(); render();
    };
    const contextLost = (event: Event) => { event.preventDefault(); setReady(false); setFailed(true); };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("keydown", keyboard);
    canvas.addEventListener("webglcontextlost", contextLost);
    setReady(true);
    return () => {
      setReady(false);
      observer.disconnect(); controls.removeEventListener("change", render); controls.dispose();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("keydown", keyboard);
      canvas.removeEventListener("webglcontextlost", contextLost);
      value.model?.dispose(); floorGeometry.dispose(); floorMaterial.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      if (world.current === value) world.current = undefined;
    };
  }, []);

  useEffect(() => {
    const current = world.current;
    if (!current || failed) return;
    if (current.model) { current.scene.remove(current.model.group); current.model.dispose(); }
    const model = buildAnatomyModel(system);
    current.model = model; current.scene.add(model.group);
    model.select(selectedId, isolate, opacity, showAttachments);
    current.render();
  }, [system, failed]);

  useEffect(() => {
    const current = world.current;
    if (!current) return;
    current.model?.select(selectedId, isolate, opacity, showAttachments); current.render();
  }, [selectedId, isolate, opacity, showAttachments, ready, system]);

  useEffect(() => {
    const current = world.current;
    if (!current) return;
    const safeZoom = Number.isFinite(zoom) ? Math.min(3.5, Math.max(1, zoom)) : 1;
    const changed = !preset.current || preset.current.view !== view || preset.current.zoom !== safeZoom
      || preset.current.system !== system || preset.current.resetKey !== resetKey;
    preset.current = { view, zoom: safeZoom, system, resetKey };
    if (!changed && safeZoom === 1) return;
    const target = new THREE.Vector3(0, 3.65, 0);
    if (safeZoom > 1.01 && selectedId) {
      const first = current.model?.structures.get(selectedId)?.[0];
      if (first) {
        const bounds = new THREE.Box3().setFromObject(first);
        // Paired meshes are batched together; zoom towards one side, rather than
        // the empty midline between two deltoids or two arms.
        if (bounds.min.x < -0.2 && bounds.max.x > 0.2) {
          const side = new THREE.Box3();
          const positions = first.geometry.getAttribute("position");
          const point = new THREE.Vector3();
          for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(first.matrixWorld);
            if (point.x < -0.025) side.expandByPoint(point);
          }
          if (!side.isEmpty()) side.getCenter(target); else bounds.getCenter(target);
        } else bounds.getCenter(target);
      }
    }
    const offset = current.camera.position.clone().sub(current.controls.target);
    current.controls.target.copy(target);
    if (changed) current.camera.position.set(target.x, target.y, target.z + (view === "anterior" ? 10.8 : -10.8) / safeZoom);
    else current.camera.position.copy(target).add(offset);
    current.camera.lookAt(target); current.controls.update(); current.render();
  }, [view, zoom, ready, system, resetKey, selectedId]);

  useEffect(() => {
    const canvas = world.current?.renderer.domElement;
    canvas?.setAttribute("aria-label", l("Modèle anatomique 3D interactif. Flèches pour tourner, plus et moins pour zoomer. Choisissez les structures dans la liste.", "Interactive 3D anatomy model. Arrow keys rotate; plus and minus zoom. Choose structures from the list."));
  }, [language, ready]);

  if (failed) return <View style={{ minHeight: height }} testID="anatomy-webgl-fallback">
    <Text style={{ padding: 12, color: "#d7e7df", fontSize: 12, textAlign: "center" }}>
      {l("La 3D est indisponible dans ce navigateur. Le schéma 2D reste interactif.", "3D is unavailable in this browser. The 2D diagram remains interactive.")}
    </Text>
    <HumanFigure system={system} view={view} selectedId={selectedId} onSelect={onSelect} zoom={zoom} height={height - 46} targetOnly={isolate} language={language} />
  </View>;

  return <div data-testid="anatomy-3d-scene" data-ready={ready ? "true" : "false"}
    style={{ position: "relative", height, minHeight: 320, width: "100%", overflow: "hidden", background: "radial-gradient(ellipse at 50% 43%, #302443 0%, #1c162b 51%, #14101d 100%)" }}>
    <div ref={host} style={{ width: "100%", height: "100%" }} />
    {!ready && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#c1d4cb", fontSize: 13 }}>{l("Préparation de la scène 3D…", "Preparing the 3D scene…")}</div>}
    <div aria-hidden="true" style={{ pointerEvents: "none", position: "absolute", right: 18, top: 18, border: "1px solid #62817b", borderRadius: 20, width: 38, height: 38, display: "grid", placeItems: "center", color: "#bcd3c8", font: "600 10px system-ui" }}>{view === "anterior" ? l("FACE", "FRONT") : l("DOS", "BACK")}</div>
    <div style={{ pointerEvents: "none", position: "absolute", bottom: 12, left: 12, right: 12, textAlign: "center", color: "#a6c0b9", font: "11px system-ui", lineHeight: "18px" }}>
      {l("Glissez pour tourner · pincez ou défilez pour zoomer", "Drag to rotate · pinch or scroll to zoom")}
    </div>
  </div>;
}
