import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export type AnatomyOcclusionReason = "active" | "disabled" | "moving" | "transparent" | "empty" | "geometry-budget" | "mobile-unmeasured" | "gpu-pending" | "gpu-budget" | "cpu-budget" | "error" | "disposed";
export type AnatomyOcclusionState = { reason: AnatomyOcclusionReason; width: number; height: number; samples: number; captured: boolean; gpuMilliseconds?: number };

/** The extra depth pass is separately bounded. These are display samples, not
 * additional anatomy, and have no effect on positions, normals or picking. */
export function anatomyOcclusionSize(width: number, height: number, lowPower: boolean) {
  const w = Math.max(1, Math.floor(Number.isFinite(width) ? width : 1));
  const h = Math.max(1, Math.floor(Number.isFinite(height) ? height : 1));
  const scale = Math.min(0.5, lowPower ? 384 / Math.max(w, h) : 1, Math.sqrt((lowPower ? 147_456 : 500_000) / (w * h)));
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)), samples: lowPower ? 8 : 12 };
}

export function anatomyOcclusionReason(input: { depthShading?: boolean; lowPower: boolean; measuredGpu: boolean; moving: boolean; opacity: number; triangles: number }): AnatomyOcclusionReason {
  if (input.depthShading === false) return "disabled";
  if (input.lowPower && !input.measuredGpu) return "mobile-unmeasured";
  if (input.moving) return "moving";
  if (!Number.isFinite(input.opacity) || input.opacity < 0.999) return "transparent";
  if (!Number.isFinite(input.triangles) || input.triangles <= 0) return "empty";
  if (input.triangles > (input.lowPower ? 3_800_000 : 6_000_000)) return "geometry-budget";
  return "active";
}

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

// View positions are reconstructed from genuine scene depth in metres. The
// local normal only guides occlusion sampling; authored mesh normals are intact.
const depthFunctions = `
#include <packing>
uniform sampler2D tDepth;
uniform mat4 inverseProjection;
uniform vec2 texel;
uniform float worldRadius;
varying vec2 vUv;
float depthAt(vec2 uv){return unpackRGBAToDepth(texture2D(tDepth,clamp(uv,texel*0.5,vec2(1.0)-texel*0.5)));}
vec3 positionAt(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}
`;

const occlusionShader = `${depthFunctions}
uniform vec2 projectedRadius;
void main(){
  float centerDepth=depthAt(vUv);
  if(centerDepth>=0.999999){gl_FragColor=vec4(1.0);return;}
  vec3 p=positionAt(vUv,centerDepth);
  vec3 right=positionAt(vUv+vec2(texel.x,0.0),depthAt(vUv+vec2(texel.x,0.0)))-p;
  vec3 left=p-positionAt(vUv-vec2(texel.x,0.0),depthAt(vUv-vec2(texel.x,0.0)));
  vec3 up=positionAt(vUv+vec2(0.0,texel.y),depthAt(vUv+vec2(0.0,texel.y)))-p;
  vec3 down=p-positionAt(vUv-vec2(0.0,texel.y),depthAt(vUv-vec2(0.0,texel.y)));
  vec3 dx=abs(right.z)<abs(left.z)?right:left;
  vec3 dy=abs(up.z)<abs(down.z)?up:down;
  vec3 normalVector=cross(dx,dy);
  if(length(normalVector)<0.00000000000001){gl_FragColor=vec4(1.0);return;}
  vec3 n=normalize(normalVector);
  if(dot(n,-p)<0.0)n=-n;
  float occluded=0.0;
  for(int i=0;i<AO_SAMPLES;i++){
    float f=(float(i)+0.5)/float(AO_SAMPLES);
    float angle=float(i)*2.39996322973;
    vec2 offset=vec2(cos(angle),sin(angle))*sqrt(f)*projectedRadius/max(-p.z,0.001);
    vec2 sampleUv=vUv+offset;
    if(any(lessThan(sampleUv,vec2(0.0)))||any(greaterThan(sampleUv,vec2(1.0))))continue;
    float d=depthAt(sampleUv);
    if(d>=0.999999)continue;
    vec3 delta=positionAt(sampleUv,d)-p;
    float distance=length(delta);
    if(distance<0.00015||distance>worldRadius)continue;
    float horizon=max(dot(n,delta/distance)-0.075,0.0);
    float falloff=1.0-smoothstep(worldRadius*0.12,worldRadius,distance);
    occluded+=horizon*falloff;
  }
  float visibility=clamp(1.0-occluded*(2.7/float(AO_SAMPLES)),0.57,1.0);
  gl_FragColor=vec4(vec3(visibility),1.0);
}`;

// Bilateral upsampling suppresses sampling bands but does not darken across a
// silhouette/depth discontinuity. Multiplication preserves the existing alpha,
// anti-aliasing and ACES/sRGB output; there is no second tone mapping operation.
const compositeShader = `${depthFunctions}
uniform sampler2D tOcclusion;
void main(){
  float depth=depthAt(vUv);
  if(depth>=0.999999){gl_FragColor=vec4(1.0);return;}
  float z=positionAt(vUv,depth).z;
  float value=0.0,weight=0.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 uv=vUv+vec2(float(x),float(y))*texel;
    float d=depthAt(uv);
    float delta=abs(positionAt(uv,d).z-z);
    float w=(x==0&&y==0?2.0:1.0)*exp(-delta/max(worldRadius*0.12,0.0001));
    if(d>=0.999999)w=0.0;
    value+=texture2D(tOcclusion,uv).r*w;weight+=w;
  }
  float visibility=weight>0.0001?value/weight:1.0;
  gl_FragColor=vec4(vec3(visibility),0.0);
}`;

type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
type OcclusionInput = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; helpers: THREE.Object3D[]; revision: number; depthShading?: boolean; moving: boolean; opacity: number; triangles: number };

/** Rendering-only contact occlusion. One extra source-depth pass on a new idle
 * view, cached for hover/selection colour changes. All GPU resources are owned. */
export function createAnatomyOcclusion(renderer: THREE.WebGLRenderer, lowPower: boolean, changed: () => void) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const extension = gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExtension | null;
  let depthTarget: THREE.WebGLRenderTarget | undefined, aoTarget: THREE.WebGLRenderTarget | undefined;
  let depthMaterial: THREE.MeshDepthMaterial | undefined, aoMaterial: THREE.ShaderMaterial | undefined, compositeMaterial: THREE.ShaderMaterial | undefined, quad: FullScreenQuad | undefined;
  let key = "", disabled: AnatomyOcclusionReason | undefined, disposed = false, captures = 0, slowCpuFrames = 0;
  let query: WebGLQuery | undefined, queryTimer: ReturnType<typeof setTimeout> | undefined, queryStarted = 0, gpuMilliseconds: number | undefined, slowGpuFrames = 0;
  let size = { width: 0, height: 0, samples: lowPower ? 8 : 12 };
  const worldRadius = 0.022;
  const queryBudget = lowPower ? 28 : 90;
  const finishQuery = () => {
    queryTimer = undefined;
    if (!query || disposed || gl.isContextLost()) return;
    try {
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        const disjoint = gl.getParameter(extension!.GPU_DISJOINT_EXT);
        if (!disjoint) {
          gpuMilliseconds = Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1_000_000;
          if (gpuMilliseconds > queryBudget) {
            slowGpuFrames++; key = "";
            // Confirm on the same idle view: the first measurement can include
            // shader compilation/buffer uploads rather than steady GPU cost.
            if (slowGpuFrames >= 2) disabled = "gpu-budget";
          } else slowGpuFrames = 0;
        } else if (lowPower) { disabled = "gpu-budget"; key = ""; }
        gl.deleteQuery(query); query = undefined; changed();
      } else if (performance.now() - queryStarted < 2500) queryTimer = setTimeout(finishQuery, 40);
      else { gl.deleteQuery(query); query = undefined; if (lowPower) { disabled = "gpu-budget"; key = ""; changed(); } }
    } catch { query = undefined; if (lowPower) { disabled = "gpu-budget"; key = ""; changed(); } }
  };
  const ensureTargets = () => {
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    const next = anatomyOcclusionSize(buffer.x, buffer.y, lowPower);
    if (!depthTarget) {
      depthTarget = new THREE.WebGLRenderTarget(next.width, next.height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: false });
      aoTarget = new THREE.WebGLRenderTarget(next.width, next.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
      depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide, blending: THREE.NoBlending });
      const uniforms = () => ({ tDepth: { value: depthTarget!.texture }, inverseProjection: { value: new THREE.Matrix4() }, texel: { value: new THREE.Vector2() }, worldRadius: { value: worldRadius } });
      aoMaterial = new THREE.ShaderMaterial({ defines: { AO_SAMPLES: next.samples }, uniforms: { ...uniforms(), projectedRadius: { value: new THREE.Vector2() } }, vertexShader, fragmentShader: occlusionShader, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false });
      compositeMaterial = new THREE.ShaderMaterial({ uniforms: { ...uniforms(), tOcclusion: { value: aoTarget.texture } }, vertexShader, fragmentShader: compositeShader, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
      quad = new FullScreenQuad(aoMaterial);
    }
    if (size.width !== next.width || size.height !== next.height) {
      depthTarget.setSize(next.width, next.height); aoTarget!.setSize(next.width, next.height); key = "";
    }
    size = next;
  };
  return {
    render(input: OcclusionInput): AnatomyOcclusionState {
      const reason = disposed ? "disposed" : input.depthShading === false ? "disabled" : disabled ?? anatomyOcclusionReason({ depthShading: input.depthShading, lowPower, measuredGpu: !!extension, moving: input.moving, opacity: input.opacity, triangles: input.triangles });
      if (reason !== "active") return { reason, ...size, captured: false, gpuMilliseconds };
      let captured = false;
      let timing = false;
      const target = renderer.getRenderTarget(), autoClear = renderer.autoClear, override = input.scene.overrideMaterial;
      const clearColor = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha();
      const visibility = input.helpers.map(object => ({ object, visible: object.visible }));
      try {
        ensureTargets();
        const planes = renderer.clippingPlanes.map(plane => [...plane.normal.toArray(), plane.constant].join(",")).join(";");
        const nextKey = `${input.revision}|${size.width},${size.height}|${input.camera.matrixWorld.elements.join(",")}|${input.camera.projectionMatrix.elements.join(",")}|${planes}`;
        if (lowPower && query && key !== nextKey) return { reason: "gpu-pending", ...size, captured: false, gpuMilliseconds };
        renderer.autoClear = true;
        if (key !== nextKey) {
          const started = performance.now();
          const timed = extension && !query;
          if (timed) { query = gl.createQuery() ?? undefined; if (query) { gl.beginQuery(extension.TIME_ELAPSED_EXT, query); timing = true; } }
          if (timed && !query && lowPower) { disabled = "gpu-budget"; return { reason: disabled, ...size, captured: false, gpuMilliseconds }; }
          visibility.forEach(({ object }) => { object.visible = false; });
          input.scene.overrideMaterial = depthMaterial!;
          renderer.setRenderTarget(depthTarget!); renderer.setClearColor(0xffffff, 1); renderer.clear();
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Anatomy depth buffer unavailable");
          renderer.render(input.scene, input.camera);
          input.scene.overrideMaterial = override; visibility.forEach(({ object, visible }) => { object.visible = visible; });
          aoMaterial!.uniforms.inverseProjection!.value.copy(input.camera.projectionMatrixInverse);
          aoMaterial!.uniforms.texel!.value.set(1 / size.width, 1 / size.height);
          aoMaterial!.uniforms.projectedRadius!.value.set(input.camera.projectionMatrix.elements[0]! * worldRadius * 0.5, input.camera.projectionMatrix.elements[5]! * worldRadius * 0.5);
          renderer.setRenderTarget(aoTarget!); renderer.setClearColor(0xffffff, 1); quad!.material = aoMaterial!; quad!.render(renderer);
          captured = true; captures++; key = nextKey;
          const cost = performance.now() - started;
          // Ignore initial shader compilation; later slow command submission is
          // a conservative fallback in addition to the asynchronous GPU timer.
          if (captures > 1 && cost > (lowPower ? 65 : 180)) slowCpuFrames++; else slowCpuFrames = 0;
          if (slowCpuFrames >= 2) { disabled = "cpu-budget"; key = ""; return { reason: disabled, ...size, captured, gpuMilliseconds }; }
        }
        compositeMaterial!.uniforms.inverseProjection!.value.copy(input.camera.projectionMatrixInverse);
        compositeMaterial!.uniforms.texel!.value.set(1 / size.width, 1 / size.height);
        renderer.setRenderTarget(target); renderer.autoClear = false;
        quad!.material = compositeMaterial!; quad!.render(renderer);
        const programs = renderer.info.programs as ({ diagnostics?: { runnable?: boolean } }[] | null);
        if (programs?.some(program => program.diagnostics?.runnable === false)) throw new Error("Anatomy occlusion shader unavailable");
        return { reason: "active", ...size, captured, gpuMilliseconds };
      } catch {
        disabled = "error"; key = "";
        return { reason: disabled, ...size, captured: false, gpuMilliseconds };
      } finally {
        if (timing && query && !gl.isContextLost()) { gl.endQuery(extension!.TIME_ELAPSED_EXT); queryStarted = performance.now(); queryTimer = setTimeout(finishQuery, 40); }
        input.scene.overrideMaterial = override; visibility.forEach(({ object, visible }) => { object.visible = visible; });
        renderer.setRenderTarget(target); renderer.setClearColor(clearColor, clearAlpha); renderer.autoClear = autoClear;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; if (queryTimer) clearTimeout(queryTimer); if (query && !gl.isContextLost()) gl.deleteQuery(query); query = undefined;
      depthTarget?.dispose(); aoTarget?.dispose(); depthMaterial?.dispose(); aoMaterial?.dispose(); compositeMaterial?.dispose(); quad?.dispose();
    },
  };
}
