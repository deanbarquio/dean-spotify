/**
 * Lightning bolts as camera-facing ribbons: a jagged trunk from midpoint
 * displacement plus forking branches, each strip expanded in screen space so
 * it keeps a crisp pixel width at any distance. The fragment shader draws a
 * white-hot core inside a coloured halo (values above 1 so bloom catches it),
 * tapering toward the branch tips. `strike()` regrows the shape, so every
 * flicker of a strike is a fresh bolt.
 */
import * as THREE from 'three';

const vert = /* glsl */ `
attribute vec3 aNext;
attribute float aSide;
attribute float aWidth;
uniform vec2 uRes;
uniform float uScale;
varying float vSide;
varying float vWidth;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
  vec2 sa = a.xy / a.w * uRes;
  vec2 sb = b.xy / b.w * uRes;
  vec2 dir = normalize(sb - sa + vec2(1e-5, 0.0));
  vec2 n = vec2(-dir.y, dir.x);
  // Width in pixels, so the bolt stays sharp near and far
  a.xy += n * aSide * aWidth * uScale / uRes * a.w;
  gl_Position = a;
  vSide = aSide;
  vWidth = aWidth;
}`;
const frag = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying float vSide;
varying float vWidth;
void main() {
  float x = abs(vSide);
  float core = exp(-x * x * 26.0);
  float halo = exp(-x * x * 3.5);
  vec3 col = vec3(1.0, 0.98, 0.95) * core * 3.2 + uColor * halo * 1.6;
  float a = (core + halo * 0.55) * uAlpha * smoothstep(0.0, 1.5, vWidth);
  gl_FragColor = vec4(col * a, a);
}`;

type Pt = THREE.Vector3;

/** Jagged polyline from a to b: recursive midpoint displacement */
function jag(a: Pt, b: Pt, spread: number, depth: number, rand: () => number, out: Pt[]) {
  if (depth === 0) {
    out.push(b.clone());
    return;
  }
  const m = a.clone().lerp(b, 0.42 + rand() * 0.16);
  const len = a.distanceTo(b);
  m.x += (rand() - 0.5) * spread * len;
  m.z += (rand() - 0.5) * spread * len;
  m.y += (rand() - 0.5) * spread * len * 0.25;
  jag(a, m, spread, depth - 1, rand, out);
  jag(m, b, spread, depth - 1, rand, out);
}

/** Upper bound on points per bolt: trunk (depth 6) + up to 10 branches (depth 4) */
const MAX_PTS = 65 + 10 * 17;

export function createLightning(color: THREE.Color) {
  const uniforms = {
    uColor: { value: color },
    uAlpha: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uScale: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
    // Winding flips with the view direction, since the ribbon is built in screen space
    side: THREE.DoubleSide,
  });
  // One preallocated buffer, rewritten in place for every new bolt: no per-flicker allocation or re-upload of new objects
  const V = MAX_PTS * 2;
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const aNext = new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const aSide = new THREE.BufferAttribute(new Float32Array(V), 1);
  const aWidth = new THREE.BufferAttribute(new Float32Array(V), 1).setUsage(THREE.DynamicDrawUsage);
  const aIdx = new THREE.BufferAttribute(new Uint16Array((MAX_PTS - 1) * 6), 1).setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < V; i++) aSide.setX(i, i % 2 ? 1 : -1);
  geo.setAttribute('position', aPos);
  geo.setAttribute('aNext', aNext);
  geo.setAttribute('aSide', aSide);
  geo.setAttribute('aWidth', aWidth);
  geo.setIndex(aIdx);
  geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.visible = false;

  /** Grow a new bolt from `from` down to `to`; `width` is the trunk width in pixels */
  function strike(from: Pt, to: Pt, width = 7, branches = 5, rand: () => number = Math.random) {
    const strips: { pts: Pt[]; w0: number; w1: number }[] = [];
    const trunk = [from.clone()];
    jag(from, to, 0.22, 6, rand, trunk);
    strips.push({ pts: trunk, w0: width * 0.7, w1: width });
    // Forks: leave the trunk part-way down, angled outward, thinner and shorter
    for (let i = 0; i < Math.min(branches, 10); i++) {
      const at = Math.floor(trunk.length * (0.12 + rand() * 0.6));
      const start = trunk[at];
      const rest = from.distanceTo(to) * (0.15 + rand() * 0.25);
      const ang = rand() * Math.PI * 2;
      const end = start.clone().add(new THREE.Vector3(Math.cos(ang) * rest * 0.7, -rest, Math.sin(ang) * rest * 0.7));
      const pts = [start.clone()];
      jag(start, end, 0.35, 4, rand, pts);
      const w = width * (0.25 + rand() * 0.25);
      strips.push({ pts, w0: w, w1: 0 });
    }

    // Two vertices per point (either side of the line), quads between neighbours
    let v = 0; // vertex cursor
    let k = 0; // index cursor
    const q = new THREE.Vector3();
    for (const s of strips) {
      const n = s.pts.length;
      if ((v >> 1) + n > MAX_PTS) break;
      s.pts.forEach((p, i) => {
        // Last point looks back so the ribbon direction stays defined
        if (i < n - 1) q.copy(s.pts[i + 1]);
        else q.copy(p).multiplyScalar(2).sub(s.pts[i - 1]);
        const w = Math.max(THREE.MathUtils.lerp(s.w0, s.w1, i / (n - 1)) * (0.8 + rand() * 0.4), 0.6);
        for (let sd = 0; sd < 2; sd++) {
          aPos.setXYZ(v + sd, p.x, p.y, p.z);
          aNext.setXYZ(v + sd, q.x, q.y, q.z);
          aWidth.setX(v + sd, w);
        }
        if (i < n - 1) {
          aIdx.setX(k++, v);
          aIdx.setX(k++, v + 1);
          aIdx.setX(k++, v + 2);
          aIdx.setX(k++, v + 1);
          aIdx.setX(k++, v + 3);
          aIdx.setX(k++, v + 2);
        }
        v += 2;
      });
    }
    // Upload only the part written this time
    for (const a of [aPos, aNext]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, v * 3);
      a.needsUpdate = true;
    }
    aWidth.clearUpdateRanges();
    aWidth.addUpdateRange(0, v);
    aWidth.needsUpdate = true;
    aIdx.clearUpdateRanges();
    aIdx.addUpdateRange(0, k);
    aIdx.needsUpdate = true;
    geo.setDrawRange(0, k);
  }

  return {
    mesh,
    strike,
    /** Brightness 0..1 */
    set alpha(a: number) {
      uniforms.uAlpha.value = a;
      mesh.visible = a > 0.002;
    },
    /** Make it drawable once (invisible) so its shader compiles at load, not on the first strike */
    prewarm() {
      strike(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 0), 1, 0);
      uniforms.uAlpha.value = 0;
      mesh.visible = true;
      return () => (mesh.visible = false);
    },
    /** Call on resize: drawing-buffer size and device pixel ratio */
    setSize(w: number, h: number, dpr: number) {
      uniforms.uRes.value.set(w * dpr * 0.5, h * dpr * 0.5);
      uniforms.uScale.value = dpr;
    },
  };
}
