/**
 * Weather over the valley.
 * - Lightning: every few seconds a burst of 2–4 quick pulses lights the scene
 *   (flash light, hemisphere boost, brighter fog and sky) and a jagged bolt
 *   forks down behind the far ridges; thunder follows after a delay.
 * - Birds: a loose flock of flapping silhouettes circling high over the maze.
 */
import * as THREE from 'three';
import { rng } from './nature';

type StormOpts = {
  scene: THREE.Scene;
  hemi: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  onThunder?: (strength: number, delay: number) => void;
};

/** Midpoint-displaced polyline with a couple of side branches, as line segments */
function boltGeometry(rand: () => number, from: THREE.Vector3, to: THREE.Vector3) {
  const pts: number[] = [];
  const fork = (a: THREE.Vector3, b: THREE.Vector3, depth: number, spread: number) => {
    if (depth === 0) {
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      return;
    }
    const m = a.clone().lerp(b, 0.5);
    m.x += (rand() - 0.5) * spread;
    m.z += (rand() - 0.5) * spread * 0.3;
    fork(a, m, depth - 1, spread * 0.55);
    fork(m, b, depth - 1, spread * 0.55);
    // Side branch off the midpoint, shorter and fainter by being split further
    if (depth > 3 && rand() < 0.45) {
      const end = m.clone().add(new THREE.Vector3((rand() - 0.5) * spread * 1.6, (b.y - a.y) * 0.35, 0));
      fork(m, end, depth - 2, spread * 0.4);
    }
  };
  fork(from, to, 7, 36);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

export function buildStorm({ scene, hemi, fog, onThunder }: StormOpts) {
  const rand = rng(41);
  const flash = new THREE.DirectionalLight('#cfe0ff', 0);
  flash.position.set(60, 160, -220);
  scene.add(flash);
  const baseHemi = hemi.intensity;
  const baseFog = fog.color.clone();
  const litFog = new THREE.Color('#6f93c4');

  const boltMat = new THREE.LineBasicMaterial({ color: new THREE.Color(3.2, 3.6, 4.4), transparent: true, opacity: 0, fog: false, toneMapped: false });
  let bolt: THREE.LineSegments | null = null;

  let next = 4 + rand() * 4;
  let pulses: { at: number; amp: number }[] = [];

  const strike = (t: number) => {
    const n = 2 + Math.floor(rand() * 3);
    pulses = Array.from({ length: n }, (_, i) => ({ at: t + i * (0.07 + rand() * 0.12), amp: i === 0 ? 1 : 0.4 + rand() * 0.6 }));
    if (bolt) {
      scene.remove(bolt);
      bolt.geometry.dispose();
    }
    // Somewhere across the far horizon, behind the maze
    const x = (rand() - 0.5) * 360;
    const z = -320 - rand() * 80;
    // Ends above the far ridgeline so it reads against the sky, not hidden behind mountains
    bolt = new THREE.LineSegments(boltGeometry(rand, new THREE.Vector3(x, 210, z), new THREE.Vector3(x + (rand() - 0.5) * 60, 70, z)), boltMat);
    bolt.frustumCulled = false;
    scene.add(bolt);
    flash.position.set(x * 0.6, 160, z * 0.8);
    const strength = 0.5 + rand() * 0.5;
    onThunder?.(strength, 0.8 + rand() * 2.2);
    next = t + 6 + rand() * 9;
  };

  return {
    tick(t: number) {
      if (t > next) strike(t);
      // Each pulse: instant rise, fast exponential fall
      let f = 0;
      for (const p of pulses) if (t >= p.at) f = Math.max(f, p.amp * Math.exp(-(t - p.at) * 14));
      flash.intensity = f * 7;
      hemi.intensity = baseHemi + f * 1.6;
      fog.color.copy(baseFog).lerp(litFog, f * 0.55);
      scene.backgroundIntensity = 1 + f * 1.3;
      boltMat.opacity = f > 0.25 ? Math.min(1, f * 1.4) : 0;
    },
  };
}

/* ───────── Birds ───────── */
export function buildBirds(count = 16) {
  const group = new THREE.Group();
  const rand = rng(77);
  const mat = new THREE.MeshBasicMaterial({ color: '#0a1220', side: THREE.DoubleSide, fog: true });
  // One wing: a swept triangle from the shoulder out to the tip
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 1.1, 0, -0.35], 3));
  const bodyGeo = new THREE.ConeGeometry(0.12, 0.8, 4).rotateX(Math.PI / 2);

  const birds = Array.from({ length: count }, (_, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, mat);
    const wings = [1, -1].map((s) => {
      const w = new THREE.Mesh(wingGeo, mat);
      w.scale.x = s;
      g.add(w);
      return w;
    });
    g.add(body);
    g.scale.setScalar(2.4 + rand() * 0.8);
    group.add(g);
    // Loose V: rank behind the leader (heading is +z), alternating sides, plus individual drift
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    return { g, wings, off: new THREE.Vector3(side * rank * 3.2 + (rand() - 0.5) * 2, (rand() - 0.5) * 3, -rank * 3.4), phase: rand() * 6, speed: 7 + rand() * 3 };
  });

  const center = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  // Wide loop over the far half of the valley, well clear of the camera
  const path = (t: number, out: THREE.Vector3) => out.set(Math.cos(t * 0.04) * 120, 48 + Math.sin(t * 0.13) * 6, Math.sin(t * 0.04) * 45 - 110);
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);

  return {
    group,
    tick(t: number) {
      path(t, center);
      path(t + 0.5, ahead);
      // Orient the formation along its heading
      m.lookAt(ahead, center, up);
      for (const b of birds) {
        const o = b.off.clone().applyMatrix4(m);
        b.g.position.copy(center).add(o);
        b.g.position.y += Math.sin(t * 0.7 + b.phase) * 0.8;
        b.g.quaternion.setFromRotationMatrix(m);
        // Flap, with occasional glides
        const glide = Math.sin(t * 0.3 + b.phase) > 0.6 ? 0.15 : 1;
        const flap = Math.sin(t * b.speed + b.phase) * 0.6 * glide;
        b.wings[0].rotation.z = flap;
        b.wings[1].rotation.z = -flap;
      }
    },
  };
}
