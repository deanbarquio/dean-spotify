/**
 * A glowing beacon per place: emissive crystal, coloured point light that
 * tints the surrounding rock, a soft halo, a faint light shaft, a column of
 * lit smoke curling up from it (so a beacon can be spotted from across the
 * valley) and sparks rising through it. Sparks share one Points draw call.
 */
import * as THREE from 'three';
import type { Place } from './places';
import { heightAt, noiseGlsl, WATER } from './terrain';

export type Beacon = {
  id: string;
  base: number;
  anchor: THREE.Vector3;
  hover: number;
  core: THREE.Mesh;
  halo: THREE.Sprite;
  light: THREE.PointLight;
  smoke: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  group: THREE.Group;
};

const SMOKE_W = 9;
const SMOKE_H = 26;
const smokeVert = /* glsl */ `
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
/** Smoke column: noise advected upward and sheared sideways with height, widening as it rises */
const smokeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uSeed, uBoost, uFogDensity;
varying vec2 vUv;
varying float vDist;
${noiseGlsl}
void main() {
  float y = vUv.y;
  // Drift: the plume leans and wanders as it climbs
  float sway = (noise(vec2(y * 1.5 - uTime * 0.12, uSeed)) - 0.5) * 0.55 * y;
  float x = (vUv.x - 0.5 - sway) / (0.1 + y * 0.42);
  // Outside the plume's envelope nothing shows: skip the noise entirely
  if (abs(x) > 1.0) discard;
  vec2 p = vec2(x * 1.4, y * 4.5 - uTime * 0.55) + uSeed;
  float n = fbm3(p + fbm3(p * 1.7 + uTime * 0.1) * 0.9);
  float body = smoothstep(1.0, 0.15, abs(x)) * smoothstep(0.28, 0.7, n);
  float a = body * smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.45, 1.0, y));
  // Brightest near the source, lit from below by the beacon
  vec3 col = mix(uColor * 1.6, uColor * 0.55 + vec3(0.08, 0.12, 0.2), smoothstep(0.0, 0.6, y));
  a *= (0.55 + uBoost * 0.35) * exp(-uFogDensity * uFogDensity * vDist * vDist * 0.6);
  gl_FragColor = vec4(col * a, a);
}`;

const SPARKS = 70;
const LIGHT = 140;

function glowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const shaftVert = /* glsl */ `
varying float vY;
void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const shaftFrag = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; varying float vY;
void main() { float a = pow(1.0 - vY, 2.0) * uAlpha; gl_FragColor = vec4(uColor * a, a); }`;

const sparkVert = /* glsl */ `
attribute vec3 aBase; attribute vec3 aColor; attribute float aSeed; attribute float aIdx;
uniform float uTime, uScale; uniform float uBoost[16];
varying vec3 vColor; varying float vA;
void main() {
  float boost = uBoost[int(aIdx)];
  float t = fract(uTime * (0.1 + fract(aSeed * 7.13) * 0.16) + aSeed);
  float ang = aSeed * 61.0 + uTime * 0.5;
  float rad = (0.3 + fract(aSeed * 3.7) * 1.5) * (1.0 + t);
  vec3 p = aBase + vec3(cos(ang) * rad, t * (6.0 + boost * 5.0), sin(ang) * rad);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + fract(aSeed * 5.3) * 1.6) * uScale / -mv.z * (1.0 - t * 0.5);
  vColor = aColor;
  vA = (1.0 - t) * smoothstep(0.0, 0.08, t) * (0.6 + boost * 0.4);
}`;
const sparkFrag = /* glsl */ `
varying vec3 vColor; varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
  gl_FragColor = vec4(vColor * 2.0 * a, a);
}`;

export function buildBeacons(places: Place[], fog: THREE.FogExp2) {
  const group = new THREE.Group();
  const glow = glowTexture();
  const crystal = new THREE.OctahedronGeometry(0.7, 0).scale(1, 1.7, 1);
  const shaftGeo = new THREE.CylinderGeometry(0.15, 0.9, 11, 16, 1, true).translate(0, 5.5, 0);
  // Base of the plume sits on the beacon; it turns to face the camera around its own vertical axis
  const smokeGeo = new THREE.PlaneGeometry(SMOKE_W, SMOKE_H).translate(0, SMOKE_H / 2 + 0.6, 0);

  const beacons: Beacon[] = places.map((p, i) => {
    // Hover just above the water when the spot is in a channel
    const base = Math.max(heightAt(p.x, p.z), WATER + 0.5);
    const g = new THREE.Group();
    g.position.set(p.x, base, p.z);
    group.add(g);
    const color = new THREE.Color(p.paint);
    const core = new THREE.Mesh(crystal, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, roughness: 0.3 }));
    core.position.y = 1.6;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    halo.position.y = 1.6;
    halo.scale.setScalar(7);
    const shaft = new THREE.Mesh(
      shaftGeo,
      new THREE.ShaderMaterial({
        vertexShader: shaftVert,
        fragmentShader: shaftFrag,
        uniforms: { uColor: { value: color }, uAlpha: { value: 0.22 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    const light = new THREE.PointLight(color, LIGHT, 34, 1.6);
    light.position.y = 2.4;
    const smoke = new THREE.Mesh(
      smokeGeo,
      new THREE.ShaderMaterial({
        vertexShader: smokeVert,
        fragmentShader: smokeFrag,
        uniforms: {
          uColor: { value: color },
          uTime: { value: 0 },
          uSeed: { value: i * 7.31 },
          uBoost: { value: 0 },
          uFogDensity: { value: fog.density },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    smoke.renderOrder = 3;
    g.add(core, halo, shaft, light, smoke);
    // Anchor at the crystal so the HTML ring encircles the light
    return { id: p.id, base, anchor: new THREE.Vector3(p.x, base + 1.6, p.z), hover: 0, core, halo, light, smoke, group: g };
  });

  /* Sparks */
  const n = places.length * SPARKS;
  const aBase = new Float32Array(n * 3);
  const aColor = new Float32Array(n * 3);
  const aSeed = new Float32Array(n);
  const aIdx = new Float32Array(n);
  const col = new THREE.Color();
  places.forEach((p, i) => {
    col.set(p.paint);
    for (let k = 0; k < SPARKS; k++) {
      const j = i * SPARKS + k;
      aBase.set([p.x, beacons[i].base + 0.6, p.z], j * 3);
      aColor.set([col.r, col.g, col.b], j * 3);
      aSeed[j] = Math.random();
      aIdx[j] = i;
    }
  });
  const geo = new THREE.BufferGeometry();
  // Positions are computed in the shader; a placeholder attribute keeps three happy
  geo.setAttribute('position', new THREE.BufferAttribute(aBase, 3));
  geo.setAttribute('aBase', new THREE.BufferAttribute(aBase, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: sparkVert,
    fragmentShader: sparkFrag,
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uBoost: { value: new Array(16).fill(0) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(geo, sparkMat);
  sparks.frustumCulled = false;
  group.add(sparks);

  return {
    group,
    beacons,
    /** Point size scale: framebuffer height / (2 tan(fov / 2)) × spark size in world units */
    setScale: (s: number) => void (sparkMat.uniforms.uScale.value = s),
    tick(t: number, camera: THREE.Camera) {
      sparkMat.uniforms.uTime.value = t;
      const boost = sparkMat.uniforms.uBoost.value as number[];
      beacons.forEach((b, i) => {
        boost[i] = b.hover;
        const su = b.smoke.material.uniforms;
        su.uTime.value = t;
        su.uBoost.value = b.hover;
        b.smoke.rotation.y = Math.atan2(camera.position.x - b.anchor.x, camera.position.z - b.anchor.z);
        b.core.rotation.y = t * 0.8 + i;
        b.core.position.y = 1.6 + Math.sin(t * 1.4 + i * 1.7) * 0.25;
        b.halo.position.y = b.core.position.y;
        b.halo.scale.setScalar(9 + b.hover * 6 + Math.sin(t * 3 + i) * 0.5);
        b.light.intensity = LIGHT * (1 + b.hover * 1.4) * (0.92 + Math.sin(t * 5.3 + i * 2.1) * 0.08);
      });
    },
  };
}
