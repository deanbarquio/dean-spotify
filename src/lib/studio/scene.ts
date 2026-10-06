/**
 * Full-screen WebGL background (haoqi.design technique, own geometry):
 *   1. backdrop  — sky gradient, cloud streaks, layout grid, die-cut stickers
 *   2. glass     — refractive glass objects (per-channel IOR, fresnel, specular)
 *                  anchored to page sections and synced to scroll
 *   3. fluid     — pointer-driven stable-fluids velocity field
 *   4. display   — scene displaced by the fluid with spectral fringes,
 *                  plus a pixel-dot trail behind the pointer
 */
import * as THREE from 'three';
import { rasterStickers, HERO_SPOTS, FOOTER_SPOTS, type Spot } from './stickers';
import { daypart, greetingGroup, disposeGroup, loadGreetingFont } from './greeting';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';

export type Scene = {
  setTheme: (dark: boolean) => void;
  destroy: () => void;
};

const CELL = 16; // css px, shared by the dot grid and the pointer trail
const TRAIL = 16;
const SIM = 128;

const rgb = (hex: string) => new THREE.Color(hex);
const THEMES = {
  light: { bg: '#b4d7f0', bg2: '#c6e2f5', cloud: '#ffffff', cloudA: 0.92, warm: '#fff1d6', warmA: 0.6, line: '#1b2a44', lineA: 0.13, trail: '#1f6bff', tint: '#9cc4ff', fresnel: 0.9, lift: 0 },
  dark: { bg: '#11285a', bg2: '#050d22', cloud: '#4a74c0', cloudA: 0.45, warm: '#2f5bc0', warmA: 0.4, line: '#cfe0ff', lineA: 0.1, trail: '#5aa2ff', tint: '#5d9bff', fresnel: 1.5, lift: 0.16 },
};

/* ───────── Shaders ───────── */
const quadVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Sky: vertical gradient, drifting diagonal cloud streaks, warm haze, layout grid with + marks */
const backdropFrag = /* glsl */ `
precision highp float;
uniform vec3 uBg, uBg2, uCloud, uWarm, uLine;
uniform float uTime, uScroll, uCloudA, uWarmA, uLineA, uDpr, uGutter, uCols, uDeep;
uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(vUv.x * asp, vUv.y + uScroll * 0.35);
  vec3 col = mix(uBg2, uBg, vUv.y);

  // Cloud bands: two fbm layers stretched along a -35deg diagonal. A broad soft
  // layer gives coverage, a finer one adds fluffy edges; cores warm to cream.
  float a = -0.6;
  vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  vec2 q1 = q * vec2(0.9, 3.0) + vec2(uTime * 0.03, uTime * 0.008);
  vec2 q2 = q * vec2(1.8, 5.5) + vec2(uTime * 0.05, 0.0);
  float n = fbm(q1 * 1.1) * 0.72 + fbm(q2 * 1.2 + 3.7) * 0.38;
  float streak = smoothstep(0.42, 0.74, n);
  float core = smoothstep(0.6, 0.86, n);
  col = mix(col, uCloud, streak * uCloudA);
  col = mix(col, vec3(1.0, 0.965, 0.89), core * uCloudA * 0.55);
  // Fine print-dot texture inside the clouds
  vec2 dpx = gl_FragCoord.xy / uDpr;
  float dither = step(0.5, fract(dpx.x * 0.34 + floor(dpx.y * 0.34) * 0.5));
  col += (dither - 0.5) * 0.035 * streak * uCloudA;
  vec2 hp = p - vec2(asp * 0.98, 1.0 + uScroll * 0.35);
  col = mix(col, uWarm, exp(-dot(hp, hp) / 0.35) * uWarmA);

  // Past the hero the sky deepens to night so content details read clearly
  vec3 night = mix(vec3(0.016, 0.035, 0.085), vec3(0.04, 0.085, 0.19), vUv.y);
  night += vec3(0.11, 0.2, 0.42) * streak * 0.32;
  col = mix(col, night, uDeep);
  vec3 lineCol = mix(uLine, vec3(0.8, 0.88, 1.0), uDeep);
  float lineA = mix(uLineA, 0.07, uDeep);

  // Layout grid fixed to the viewport
  vec2 px = gl_FragCoord.xy / uDpr;
  vec2 res = uRes / uDpr;
  float colW = (res.x - 2.0 * uGutter) / uCols;
  float rowH = res.y / 3.0;
  float inside = step(uGutter - 1.0, px.x) * step(px.x, res.x - uGutter + 1.0);
  float dx = abs(mod(px.x - uGutter + colW * 0.5, colW) - colW * 0.5);
  float dy = abs(mod(px.y + rowH * 0.5, rowH) - rowH * 0.5);
  float vLine = (1.0 - smoothstep(0.0, 0.9, dx)) * inside;
  float hLine = 1.0 - smoothstep(0.0, 0.9, dy);
  float cross = ((1.0 - smoothstep(0.0, 0.9, dx)) * step(dy, 6.0) + (1.0 - smoothstep(0.0, 0.9, dy)) * step(dx, 6.0)) * inside;
  col = mix(col, lineCol, clamp(max(vLine, hLine) * lineA + cross * mix(0.35, 0.18, uDeep), 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const copyFrag = /* glsl */ `
uniform sampler2D tMap;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tMap, vUv); }`;

const glassVert = /* glsl */ `
varying vec3 vN;
varying vec3 vEye;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vEye = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const glassFrag = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uRes;
uniform float uIor, uPower, uAberration, uTintAmt, uShine, uFresnel, uFresK, uLift, uGloss;
uniform vec3 uTint, uLight;
varying vec3 vN;
varying vec3 vEye;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vN);
  vec3 e = normalize(vEye);
  vec3 rR = refract(e, n, 1.0 / (uIor - 0.03));
  vec3 rG = refract(e, n, 1.0 / uIor);
  vec3 rB = refract(e, n, 1.0 / (uIor + 0.04));
  float jitter = hash(uv) * 0.02;
  vec3 col = vec3(0.0);
  const int LOOP = 8;
  for (int i = 0; i < LOOP; i++) {
    float slide = float(i) / float(LOOP) * 0.1 + jitter;
    col.r += texture2D(tMap, uv + rR.xy * (uPower + slide) * uAberration).r;
    col.g += texture2D(tMap, uv + rG.xy * (uPower + slide * 2.0) * uAberration).g;
    col.b += texture2D(tMap, uv + rB.xy * (uPower + slide * 3.0) * uAberration).b;
  }
  col /= float(LOOP);
  // Thickness-weighted blue tint: denser at grazing angles
  float facing = abs(dot(n, e));
  col = mix(col, col * uTint * 1.25, uTintAmt * (1.0 - facing * 0.6));
  // Inner glow keeps the glass readable over a dark sky
  col += uTint * uLift * (0.45 + (1.0 - facing));
  // Specular + side fresnel rim
  vec3 V = -e;
  vec3 L = normalize(uLight);
  vec3 H = normalize(V + L);
  float spec = pow(max(dot(n, H), 0.0), uShine);
  float fres = pow(1.0 - facing, 5.0);
  float side = smoothstep(-0.5, 0.5, dot(n, normalize(vec3(-1.0, 0.3, 1.0))));
  col += spec * 1.1 + fres * side * uFresnel * uFresK * vec3(0.86, 0.93, 1.0);

  // "Liquid glass" finish (uGloss): thin bright rim round the silhouette and a
  // small counter-light from below; the body stays clear (no milky lift)
  if (uGloss > 0.0) {
    float rim = smoothstep(0.8, 0.99, 1.0 - facing);
    vec3 L2 = normalize(vec3(4.0, -7.0, 5.0));
    float spec2 = pow(max(dot(n, normalize(V + L2)), 0.0), uShine * 0.6);
    col += (rim * 0.22 + spec2 * 0.3) * uGloss;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const simVert = quadVert;

const curlFrag = /* glsl */ `
precision highp float;
uniform sampler2D uVel; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  float l = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float r = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float t = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`;

const forceFrag = /* glsl */ `
precision highp float;
uniform sampler2D uVel, uCurl;
uniform vec2 uTexel, uPointer, uDelta;
uniform float uAspect, uCurlStrength, uRadius, uForce, uDt;
varying vec2 vUv;
void main() {
  float l = abs(texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
  float r = abs(texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
  float t = abs(texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x);
  float b = abs(texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x);
  float c = texture2D(uCurl, vUv).x;
  vec2 f = vec2(t - b, r - l);
  f = length(f) > 1e-4 ? normalize(f) : vec2(0.0);
  f *= uCurlStrength * c;
  f.y *= -1.0;
  vec2 v = texture2D(uVel, vUv).xy + f * uDt;
  vec2 d = vUv - uPointer;
  d.x *= uAspect;
  v += uDelta * uForce * exp(-dot(d, d) / uRadius);
  gl_FragColor = vec4(clamp(v, vec2(-1000.0), vec2(1000.0)), 0.0, 1.0);
}`;

const divergenceFrag = /* glsl */ `
precision highp float;
uniform sampler2D uVel; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  float l = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).y;
  float b = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const pressureFrag = /* glsl */ `
precision highp float;
uniform sampler2D uPressure, uDiv; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4((l + r + t + b - texture2D(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const gradientFrag = /* glsl */ `
precision highp float;
uniform sampler2D uVel, uPressure; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(texture2D(uVel, vUv).xy - vec2(r - l, t - b), 0.0, 1.0);
}`;

const advectFrag = /* glsl */ `
precision highp float;
uniform sampler2D uVel; uniform vec2 uTexel; uniform float uDt, uDissipation; varying vec2 vUv;
void main() {
  vec2 coord = clamp(vUv - texture2D(uVel, vUv).xy * uTexel * uDt, 0.0, 1.0);
  gl_FragColor = vec4(texture2D(uVel, coord).xy / (1.0 + uDissipation * uDt), 0.0, 1.0);
}`;

/**
 * Sticker composite. uGhost 0 → stickers as drawn; 1 → faint dot-matrix ghost:
 * a fine halftone where each dot samples its cell centre, desaturated toward
 * the night sky so content stays readable on top. Input/output premultiplied.
 */
const ghostFrag = /* glsl */ `
precision highp float;
uniform sampler2D tStk;
uniform float uGhost, uFade, uDpr;
uniform vec2 uRes;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  vec4 direct = texture2D(tStk, vUv);
  float cell = 5.0 * uDpr;
  vec2 id = floor(gl_FragCoord.xy / cell);
  vec4 s = texture2D(tStk, (id + 0.5) * cell / uRes);
  vec3 rgb = s.a > 0.001 ? s.rgb / s.a : vec3(0.0);
  float r = 0.46 * sqrt(s.a);
  float d = length(fract(gl_FragCoord.xy / cell) - 0.5);
  float dotMask = smoothstep(r, r - 0.14, d);
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  vec3 ink = mix(mix(vec3(lum), rgb, 0.55), uTint + 0.35, 0.35);
  float a = dotMask * s.a * 0.22;
  vec4 halftone = vec4(ink * a, a);
  gl_FragColor = mix(direct, halftone, uGhost) * uFade;
}`;

const displayFrag = /* glsl */ `
precision highp float;
uniform sampler2D tScene, uVel;
uniform vec2 uTexel, uRes;
uniform float uStrength, uSpectral, uDpr;
uniform vec2 uTrail[${TRAIL}];
uniform float uTrailStrength[${TRAIL}];
uniform vec3 uTrailColor;
varying vec2 vUv;
vec3 spectrum(float x) { return cos((x - vec3(0.0, 0.5, 1.0)) * vec3(0.6, 1.0, 0.5) * 3.14); }
void main() {
  vec2 disp = texture2D(uVel, vUv).xy * uTexel * uStrength;
  float mag = length(disp);
  vec3 col = vec3(0.0);
  vec3 wsum = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float t = float(i) / 3.0;
    vec3 w = max(vec3(0.0), cos((t - vec3(0.0, 0.5, 1.0)) * 3.14159 * 0.5));
    col += texture2D(tScene, clamp(vUv - disp * (t + 0.3), 0.0, 1.0)).rgb * w;
    wsum += w;
  }
  col /= max(wsum, vec3(1e-4));
  col += spectrum(sin(mag * 40.0) * 0.4 + 0.6) * smoothstep(0.004, 0.03, mag) * uSpectral;

  // Pixel-dot trail: light up the 16px cells the pointer just crossed
  vec2 cellPx = vec2(${CELL.toFixed(1)}) * uDpr;
  vec2 cellId = floor(gl_FragCoord.xy / cellPx);
  float hi = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec2 pc = floor(uTrail[i] * uRes / cellPx);
    vec2 dd = abs(cellId - pc);
    float same = 1.0 - step(0.5, max(dd.x, dd.y));
    hi = max(hi, same * uTrailStrength[i]);
  }
  float dist = distance(fract(gl_FragCoord.xy / cellPx), vec2(0.5));
  float aa = fwidth(dist) * 1.5;
  float dotMask = smoothstep(0.34, 0.34 - aa, dist);
  col = mix(col, uTrailColor, dotMask * hi * 0.9);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ───────── Geometry ───────── */
function starGeometry() {
  // Four-point sparkle, extruded and bevelled so the glass has thickness
  const s = new THREE.Shape();
  const R = 1;
  const k = 0.16;
  s.moveTo(0, R);
  s.quadraticCurveTo(k, k, R, 0);
  s.quadraticCurveTo(k, -k, 0, -R);
  s.quadraticCurveTo(-k, -k, -R, 0);
  s.quadraticCurveTo(-k, k, 0, R);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 10, curveSegments: 24 });
  g.center();
  return g;
}

/* ───────── Scene ───────── */
export function createScene(canvas: HTMLCanvasElement, { reducedMotion = false, dark = false } = {}): Scene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
  // The fluid needs float render targets; without them keep glass + backdrop only
  const fluid = !reducedMotion && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  // Everything is authored directly in sRGB values; skip conversions
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false;

  const quad = new THREE.PlaneGeometry(2, 2);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pass = (frag: string, uniforms: Record<string, THREE.IUniform>) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(quad, mat);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return { mat, scene, render: (target: THREE.WebGLRenderTarget | null) => (renderer.setRenderTarget(target), renderer.render(scene, ortho)) };
  };

  /* Render targets */
  const rtOpts = { depthBuffer: false, stencilBuffer: false } as const;
  const rtBack = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true });
  const simOpts = { ...rtOpts, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  const mkSim = () => new THREE.WebGLRenderTarget(SIM, SIM, simOpts);
  let vel = [mkSim(), mkSim()];
  let prs = [mkSim(), mkSim()];
  const rtDiv = mkSim();
  const rtCurl = mkSim();
  const texel = new THREE.Vector2(1 / SIM, 1 / SIM);

  /* Passes */
  const theme = { ...THEMES[dark ? 'dark' : 'light'] };
  const backdrop = pass(backdropFrag, {
    uBg: { value: rgb(theme.bg) },
    uBg2: { value: rgb(theme.bg2) },
    uCloud: { value: rgb(theme.cloud) },
    uCloudA: { value: theme.cloudA },
    uWarm: { value: rgb(theme.warm) },
    uWarmA: { value: theme.warmA },
    uLine: { value: rgb(theme.line) },
    uLineA: { value: theme.lineA },
    uGutter: { value: 56 },
    uCols: { value: 3 },
    uDeep: { value: 0 },
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uDpr: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
  });
  const curl = pass(curlFrag, { uVel: { value: null }, uTexel: { value: texel } });
  const force = pass(forceFrag, {
    uVel: { value: null },
    uCurl: { value: null },
    uTexel: { value: texel },
    uPointer: { value: new THREE.Vector2(-1, -1) },
    uDelta: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uCurlStrength: { value: 18 },
    uRadius: { value: 0.0012 },
    uForce: { value: 1 },
    uDt: { value: 1 / 60 },
  });
  const divergence = pass(divergenceFrag, { uVel: { value: null }, uTexel: { value: texel } });
  const pressure = pass(pressureFrag, { uPressure: { value: null }, uDiv: { value: null }, uTexel: { value: texel } });
  const gradient = pass(gradientFrag, { uVel: { value: null }, uPressure: { value: null }, uTexel: { value: texel } });
  const advect = pass(advectFrag, { uVel: { value: null }, uTexel: { value: texel }, uDt: { value: 1 / 60 }, uDissipation: { value: 3.2 } });
  const clearSim = pass('void main(){ gl_FragColor = vec4(0.0); }', {});
  const display = pass(displayFrag, {
    tScene: { value: rtScene.texture },
    uVel: { value: null },
    uTexel: { value: texel },
    uRes: { value: new THREE.Vector2(1, 1) },
    // Kept subtle: a gentle ripple behind the pointer, not a smear
    uStrength: { value: fluid ? 0.012 : 0 },
    uSpectral: { value: 0.06 },
    uDpr: { value: 1 },
    uTrail: { value: Array.from({ length: TRAIL }, () => new THREE.Vector2(-1, -1)) },
    uTrailStrength: { value: new Array(TRAIL).fill(0) },
    uTrailColor: { value: rgb(theme.trail) },
  });

  /* Glass scene */
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.z = 40;
  const glass = new THREE.Scene();
  const bgCopy = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: copyFrag, uniforms: { tMap: { value: rtBack.texture } }, depthTest: false, depthWrite: false })
  );
  bgCopy.frustumCulled = false;
  bgCopy.renderOrder = -1;
  glass.add(bgCopy);

  const glassMat = (overrides: Partial<Record<string, number>> = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: glassVert,
      fragmentShader: glassFrag,
      uniforms: {
        tMap: { value: rtBack.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uIor: { value: overrides.ior ?? 1.2 },
        uPower: { value: 0.24 },
        uAberration: { value: overrides.aberration ?? 0.26 },
        uTint: { value: rgb(theme.tint) },
        uTintAmt: { value: overrides.tint ?? 0.45 },
        uShine: { value: overrides.shine ?? 40 },
        uFresnel: { value: theme.fresnel },
        uFresK: { value: overrides.fresnel ?? 1 },
        uLift: { value: theme.lift },
        uGloss: { value: overrides.gloss ?? 0 },
        uLight: { value: new THREE.Vector3(-4, 9, 6) },
      },
    });
  const mats: THREE.ShaderMaterial[] = [];
  type Placed = { mesh: THREE.Object3D; size: THREE.Vector3 };
  const add = (geo: THREE.BufferGeometry | THREE.Object3D, mat: THREE.ShaderMaterial): Placed => {
    mats.push(mat);
    const mesh = geo instanceof THREE.Object3D ? geo : new THREE.Mesh(geo, mat);
    mesh.visible = false;
    glass.add(mesh);
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    return { mesh, size };
  };
  // Greeting: blue-tinted, strongly refracting glass; tight highlights and a
  // damped fresnel so the puffy bevels don't wash out white
  const wordMat = glassMat({ tint: 0.62, aberration: 0.36, ior: 1.3, gloss: 1, shine: 110, fresnel: 0.45 });
  // Greeting follows the visitor's clock; rebuilt when morning → afternoon → evening
  // One line on wide screens, stacked on narrow ones; rebuilt when either changes
  let part = daypart();
  let oneLine = window.innerWidth >= 1024;
  let font: Font | null = null;
  // Empty until the font arrives; then built and swapped in
  const mono = add(new THREE.Group(), wordMat);
  mono.size.set(1, 1, 1);
  const refreshGreeting = (force = false) => {
    if (!font) return;
    const next = daypart();
    const wide = window.innerWidth >= 1024;
    if (!force && next === part && wide === oneLine) return;
    part = next;
    oneLine = wide;
    const old = mono.mesh;
    const fresh = greetingGroup(part, wordMat, oneLine, font);
    fresh.visible = old.visible;
    glass.remove(old);
    disposeGroup(old);
    glass.add(fresh);
    mono.mesh = fresh;
    mono.size = new THREE.Box3().setFromObject(fresh).getSize(new THREE.Vector3());
  };
  const greetTimer = window.setInterval(refreshGreeting, 60_000);
  loadGreetingFont()
    .then((f) => {
      font = f;
      refreshGreeting(true);
    })
    .catch((err) => console.warn('Greeting font failed to load', err));

  /* Sticker layers, both end up in the backdrop target so the glass refracts them.
     Hero stickers render to their own target first so they can fade into a halftone ghost. */
  const stickerScene = new THREE.Scene();
  const footScene = new THREE.Scene();
  const rtStickers = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const ghost = pass(ghostFrag, {
    tStk: { value: rtStickers.texture },
    uGhost: { value: 0 },
    uFade: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uTint: { value: new THREE.Color(0.06, 0.12, 0.26) },
  });
  // The sticker target holds premultiplied colour: composite with ONE / ONE_MINUS_SRC_ALPHA
  Object.assign(ghost.mat, {
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  type StickerMesh = { mesh: THREE.Mesh; spot: Spot; phase: number };
  /** Hero confetti state, css px / seconds; flip = tumble angle around the plane's tilt axes */
  type Bit = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; flip: number; flipV: number };
  const heroStickers: StickerMesh[] = [];
  const bits: Bit[] = [];
  const footStickers: StickerMesh[] = [];
  const stickerGeo = new THREE.PlaneGeometry(1, 1);
  rasterStickers().then((canvases) => {
    const build = (spots: Spot[], list: StickerMesh[], target: THREE.Scene) =>
      spots.forEach((spot, i) => {
        const c = canvases.get(spot.id);
        if (!c) return;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.NoColorSpace;
        tex.anisotropy = 4;
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
        const mesh = new THREE.Mesh(stickerGeo, mat);
        mesh.renderOrder = Math.round((spot.d + 1) * 10);
        mesh.visible = false;
        target.add(mesh);
        list.push({ mesh, spot, phase: i * 1.7 });
      });
    build(HERO_SPOTS, heroStickers, stickerScene);
    build(FOOTER_SPOTS, footStickers, footScene);
    // Pop out of the greeting on arrival
    burst(w * 0.5, w < 1024 ? h * 0.26 : h * 0.57);
  }).catch((err) => console.warn('Stickers failed to load', err));
  const star = add(starGeometry(), glassMat({ tint: 0.7, aberration: 0.32 }));
  const ring = add(new THREE.TorusGeometry(3, 1.05, 64, 180), glassMat({ ior: 1.24 }));
  const orb = add(new THREE.SphereGeometry(1, 64, 48), glassMat({ tint: 0.55 }));

  /* State */
  let w = 1;
  let h = 1;
  let dpr = 1;
  let unit = 1; // world units per css px at z = 0
  const pointer = { x: -1, y: -1, px: -1, py: -1, has: false, nx: 0, ny: 0, sx: 0, sy: 0 };
  const trail = { i: 0, pts: display.mat.uniforms.uTrail.value as THREE.Vector2[], str: display.mat.uniforms.uTrailStrength.value as number[], lastCell: '' };

  const resize = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    rtBack.setSize(bw, bh);
    rtScene.setSize(bw, bh);
    rtStickers.setSize(bw, bh);
    ghost.mat.uniforms.uRes.value.set(bw, bh);
    ghost.mat.uniforms.uDpr.value = dpr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    unit = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
    backdrop.mat.uniforms.uRes.value.set(bw, bh);
    backdrop.mat.uniforms.uDpr.value = dpr;
    // Grid matches the page gutter (--px) and haoqi's three columns
    backdrop.mat.uniforms.uGutter.value = w >= 1024 ? 56 : 16;
    backdrop.mat.uniforms.uCols.value = w >= 1024 ? 3 : 2;
    display.mat.uniforms.uRes.value.set(bw, bh);
    display.mat.uniforms.uDpr.value = dpr;
    mats.forEach((m) => m.uniforms.uRes.value.set(bw, bh));
    // Square sim cells: stretch the sim grid with the viewport
    const sw = w >= h ? SIM : Math.round((SIM * w) / h);
    const sh = w >= h ? Math.round((SIM * h) / w) : SIM;
    [...vel, ...prs, rtDiv, rtCurl].forEach((t) => t.setSize(sw, sh));
    texel.set(1 / sw, 1 / sh);
    force.mat.uniforms.uAspect.value = w / h;
    refreshGreeting();
  };

  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.has) {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.has = true;
    }
    pointer.nx = (e.clientX / w) * 2 - 1;
    pointer.ny = (e.clientY / h) * 2 - 1;
    // Trail: one entry per newly entered cell
    const key = `${Math.floor(e.clientX / CELL)}:${Math.floor(e.clientY / CELL)}`;
    if (key !== trail.lastCell) {
      trail.lastCell = key;
      trail.pts[trail.i].set(e.clientX / w, 1 - e.clientY / h);
      trail.str[trail.i] = 1;
      trail.i = (trail.i + 1) % TRAIL;
    }
  };
  const onLeave = () => {
    pointer.has = false;
  };
  // Clicking empty hero space pops the confetti again from the pointer
  let heroDeep = 1;
  const onDown = (e: PointerEvent) => {
    onMove(e);
    if (reducedMotion || heroDeep > 0.3) return;
    if ((e.target as Element | null)?.closest('a, button, input, textarea, select, [role="button"]')) return;
    burst(e.clientX, e.clientY);
  };

  /** Place a mesh at a css-px screen point with a css-px width */
  const place = (o: Placed, sx: number, sy: number, widthPx: number) => {
    o.mesh.position.set((sx - w / 2) * unit, -(sy - h / 2) * unit, 0);
    o.mesh.scale.setScalar((widthPx * unit) / Math.max(o.size.x, 1e-3));
  };
  const visible = (r: DOMRect | undefined, margin = 200) => !!r && r.bottom > -margin && r.top < h + margin;

  const stickerScale = (mobile: boolean) => (mobile ? 0.58 : THREE.MathUtils.clamp(w / 1440, 0.75, 1.25));

  /** Launch every hero sticker from one point, fanned upward like a confetti popper */
  const burst = (cx: number, cy: number) =>
    heroStickers.forEach((_, i) => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const v = 520 + Math.random() * 680;
      bits[i] = {
        x: cx,
        y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 5,
        flip: Math.random() * Math.PI * 2,
        flipV: 2 + Math.random() * 3,
      };
    });

  /** Hero confetti: gravity and air drag after the burst, then a slow tumbling
   *  fall with sideways flutter; anything leaving the bottom re-enters at the top.
   *  Reduced motion keeps the static scatter from HERO_SPOTS. */
  const confetti = (rect: DOMRect | undefined, mobile: boolean, t: number, dt: number, max: number) => {
    const k = stickerScale(mobile);
    heroStickers.forEach(({ mesh, spot, phase }, i) => {
      const b = bits[i];
      if (!rect || !b || i >= max) return void (mesh.visible = false);
      const d = spot.d;
      const size = spot.s * k;
      if (reducedMotion) {
        b.x = spot.x * w;
        b.y = spot.y * h;
        b.rot = THREE.MathUtils.degToRad(-spot.r);
        b.flip = 0;
      } else {
        // Nearer stickers (higher d) fall a little faster: cheap depth cue
        const fall = 70 + (d + 1) * 35;
        const drag = Math.exp(-1.8 * dt);
        b.vx *= drag;
        b.vy = Math.min(b.vy * drag + 1100 * dt, fall);
        b.x += (b.vx + Math.sin(t * 1.3 + phase) * 40) * dt;
        b.y += b.vy * dt;
        b.rot += b.spin * dt;
        b.flip += b.flipV * dt;
        if (b.y > h + size) {
          b.y = -size - Math.random() * h * 0.3;
          b.x = Math.random() * w;
          b.vx = 0;
          b.vy = fall;
        }
      }
      const sx = b.x + pointer.sx * d * 18;
      const sy = b.y + pointer.sy * d * 12;
      mesh.visible = sy > -size && sy < h + size;
      if (!mesh.visible) return;
      mesh.position.set((sx - w / 2) * unit, -(sy - h / 2) * unit, 0);
      mesh.scale.setScalar(size * unit * 1.25);
      // Tilt stays under 90deg so the single-sided plane never turns its back
      mesh.rotation.set(Math.sin(b.flip) * 1.2, Math.cos(b.flip * 0.7) * 0.9, b.rot);
    });
  };

  /** Footer stickers float, bob and parallax by depth, riding their anchor section */
  const layoutStickers = (list: StickerMesh[], rect: DOMRect | undefined, mobile: boolean, t: number, max: number) => {
    const k = stickerScale(mobile);
    list.forEach(({ mesh, spot, phase }, i) => {
      if (!rect || i >= max) return void (mesh.visible = false);
      const d = spot.d;
      const bob = Math.sin(t * 0.8 + phase) * 6;
      const sx = spot.x * w + pointer.sx * d * 18;
      const sy = rect.top * (1 - d * 0.12) + spot.y * h + pointer.sy * d * 12 + bob;
      const size = spot.s * k;
      mesh.visible = sy > -size && sy < h + size;
      if (!mesh.visible) return;
      mesh.position.set((sx - w / 2) * unit, -(sy - h / 2) * unit, 0);
      // Texture carries 10% padding per side for the drop shadow
      mesh.scale.setScalar(size * unit * 1.25);
      mesh.rotation.set(pointer.sy * 0.25 * d, pointer.sx * 0.3 * d, THREE.MathUtils.degToRad(-spot.r) + Math.sin(t * 0.6 + phase) * 0.05);
    });
  };

  const setTheme = (isDark: boolean) => {
    Object.assign(theme, THEMES[isDark ? 'dark' : 'light']);
    const u = backdrop.mat.uniforms;
    u.uBg.value.set(theme.bg);
    u.uBg2.value.set(theme.bg2);
    u.uCloud.value.set(theme.cloud);
    u.uCloudA.value = theme.cloudA;
    u.uWarm.value.set(theme.warm);
    u.uWarmA.value = theme.warmA;
    u.uLine.value.set(theme.line);
    u.uLineA.value = theme.lineA;
    display.mat.uniforms.uTrailColor.value.set(theme.trail);
    mats.forEach((m) => {
      m.uniforms.uTint.value.set(theme.tint);
      m.uniforms.uFresnel.value = theme.fresnel;
      m.uniforms.uLift.value = theme.lift;
    });
  };

  /* Sim step */
  const swap = (pair: THREE.WebGLRenderTarget[]) => [pair[1], pair[0]];
  const step = (dt: number) => {
    curl.mat.uniforms.uVel.value = vel[0].texture;
    curl.render(rtCurl);

    const f = force.mat.uniforms;
    f.uVel.value = vel[0].texture;
    f.uCurl.value = rtCurl.texture;
    f.uDt.value = dt;
    if (pointer.has && !reducedMotion) {
      f.uPointer.value.set(pointer.x / w, 1 - pointer.y / h);
      // Pointer delta in sim texels per second
      f.uDelta.value.set(((pointer.x - pointer.px) / w) / texel.x / dt, (-(pointer.y - pointer.py) / h) / texel.y / dt);
      f.uDelta.value.multiplyScalar(0.4);
    } else f.uDelta.value.set(0, 0);
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    force.render(vel[1]);
    vel = swap(vel);

    divergence.mat.uniforms.uVel.value = vel[0].texture;
    divergence.render(rtDiv);

    clearSim.render(prs[0]);
    pressure.mat.uniforms.uDiv.value = rtDiv.texture;
    for (let i = 0; i < 14; i++) {
      pressure.mat.uniforms.uPressure.value = prs[0].texture;
      pressure.render(prs[1]);
      prs = swap(prs);
    }

    gradient.mat.uniforms.uVel.value = vel[0].texture;
    gradient.mat.uniforms.uPressure.value = prs[0].texture;
    gradient.render(vel[1]);
    vel = swap(vel);

    advect.mat.uniforms.uVel.value = vel[0].texture;
    advect.mat.uniforms.uDt.value = dt;
    advect.render(vel[1]);
    vel = swap(vel);
  };

  /* Frame */
  let last = performance.now();
  let time = 0;
  let raf = 0;
  let running = true;
  const frame = (now: number) => {
    raf = running ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(Math.max((now - last) / 1000, 1 / 240), 1 / 30);
    last = now;
    time += dt;
    const scrollY = window.scrollY;
    const ease = 1 - Math.pow(0.0015, dt);
    pointer.sx += (pointer.nx - pointer.sx) * ease;
    pointer.sy += (pointer.ny - pointer.sy) * ease;

    const heroR = document.getElementById('top')?.getBoundingClientRect();
    const footR = document.getElementById('contact')?.getBoundingClientRect();
    const caseR = document.querySelector('.case-hero')?.getBoundingClientRect();
    const mobile = w < 1024;
    const tAnim = reducedMotion ? 0 : time;

    // 1. Backdrop: sky, then the sticker layer on top of it
    backdrop.mat.uniforms.uTime.value = reducedMotion ? 0 : time;
    backdrop.mat.uniforms.uScroll.value = scrollY / Math.max(h, 1);
    // 0 while the hero fills the screen → 1 once it has scrolled away
    const lead = heroR ?? caseR;
    const deep = lead ? THREE.MathUtils.smoothstep(1 - lead.bottom / h, 0.25, 0.85) : 1;
    // Ghosts recede further when the footer brings its own crisp cluster
    const tuck = footR ? THREE.MathUtils.smoothstep(1 - footR.top / h, 0.2, 0.6) : 0;
    backdrop.mat.uniforms.uDeep.value = deep;
    // Glass picks up the night-sky glow as the page deepens
    mats.forEach((m) => {
      m.uniforms.uLift.value = theme.lift + (THEMES.dark.lift - theme.lift) * deep;
      m.uniforms.uFresnel.value = theme.fresnel + (THEMES.dark.fresnel - theme.fresnel) * deep;
    });
    backdrop.render(rtBack);
    // Hero stickers: confetti over the viewport → own target → composited crisp or as halftone ghosts
    heroDeep = deep;
    confetti(heroR ?? caseR, mobile, tAnim, dt, mobile ? 9 : Infinity);
    renderer.setRenderTarget(rtStickers);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(stickerScene, camera);
    ghost.mat.uniforms.uGhost.value = deep;
    ghost.mat.uniforms.uFade.value = 1 - tuck * 0.65;
    ghost.render(rtBack);
    // Footer cluster stays crisp
    layoutStickers(footStickers, footR, mobile, tAnim, mobile ? 4 : Infinity);
    renderer.setRenderTarget(rtBack);
    renderer.render(footScene, camera);

    // 2. Glass objects follow their sections
    mono.mesh.visible = visible(heroR);
    if (heroR && mono.mesh.visible) {
      const prog = THREE.MathUtils.clamp(-heroR.top / Math.max(heroR.height, 1), 0, 1);
      // scrollSync < 1: drifts slower than the page, like haoqi's 0.72
      // Centred in the open band between the intro text and the headline
      const y = heroR.top * 0.72 + (mobile ? h * 0.26 : h * 0.57);
      const aspect = mono.size.x / Math.max(mono.size.y, 1e-3);
      place(mono, w * 0.5, y, mobile ? Math.min(w * 0.94, h * 0.34 * aspect) : Math.min(w * 0.86, h * 0.4 * aspect));
      // Face-on so it stays legible: gentle sway, pointer tilt, and it tips back as the hero scrolls away
      mono.mesh.rotation.set(0.06 + pointer.sy * 0.12 + prog * 0.9, Math.sin(tAnim * 0.45) * 0.06 + pointer.sx * 0.14, -0.03);
    }
    star.mesh.visible = visible(heroR);
    if (heroR && star.mesh.visible) {
      const y = heroR.top * 0.9 + (mobile ? h * 0.13 : h * 0.47);
      place(star, mobile ? w * 0.86 : w * 0.35, y, mobile ? 64 : 100);
      star.mesh.rotation.set(0.3 + pointer.sy * 0.3, tAnim * 0.8 + (-heroR.top / h) * Math.PI * 2, Math.PI / 4 + pointer.sx * 0.2);
    }
    ring.mesh.visible = visible(footR, 0);
    if (footR && ring.mesh.visible) {
      const prog = 1 - THREE.MathUtils.clamp(footR.top / h, 0, 1);
      place(ring, w * (mobile ? 0.5 : 0.62), footR.top + footR.height * 0.48, mobile ? w * 0.7 : Math.min(w * 0.34, 600));
      // Mostly face-on so the hole frames the sign-off; tips toward the pointer
      ring.mesh.rotation.set(-0.7 + prog * 0.75 + pointer.sy * 0.3, Math.sin(tAnim * 0.3) * 0.3 + pointer.sx * 0.35, prog * 0.6);
    }
    orb.mesh.visible = visible(caseR);
    if (caseR && orb.mesh.visible) {
      place(orb, w * (mobile ? 0.82 : 0.84), caseR.top * 0.8 + caseR.height * 0.42, mobile ? 120 : 220);
      orb.mesh.rotation.set(pointer.sy * 0.3, tAnim * 0.2, 0);
    }

    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(glass, camera);

    // 3. Fluid
    if (fluid) step(dt);

    // 4. Display (decay the trail first)
    for (let i = 0; i < TRAIL; i++) trail.str[i] = Math.max(0, trail.str[i] - dt * 2.2);
    display.mat.uniforms.uVel.value = vel[0].texture;
    renderer.setRenderTarget(null);
    renderer.clear();
    display.render(null);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(frame);

  return {
    setTheme,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      clearInterval(greetTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };
}
