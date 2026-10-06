/**
 * Atmosphere: dark pine stands on the outer slopes (instanced) and big soft
 * mist billboards drifting through the valley.
 */
import * as THREE from 'three';
import { heightAt } from './terrain';

/** Seeded RNG so the valley looks the same on every visit */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTrees() {
  const rand = rng(7);
  const spots: { x: number; z: number; y: number }[] = [];
  for (let tries = 0; spots.length < 1100 && tries < 16000; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 92 + rand() * 80;
    // Denser on the left flank, like a treeline framing the maze
    if (Math.cos(a) > 0.2 && rand() < 0.6) continue;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > 32) continue;
    spots.push({ x, z, y });
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#0c1a22', roughness: 1 }),
    spots.length
  );
  const o = new THREE.Object3D();
  spots.forEach((s, i) => {
    const k = 0.8 + rand() * 0.9;
    o.position.set(s.x, s.y - 0.3, s.z);
    o.scale.set(k, k * (3.4 + rand() * 1.6), k);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Soft cloudy blot used by every mist billboard */
function mistTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rand = rng(3);
  for (let i = 0; i < 26; i++) {
    const x = S * (0.25 + rand() * 0.5);
    const y = S * (0.3 + rand() * 0.4);
    const r = S * (0.12 + rand() * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildMist() {
  const group = new THREE.Group();
  const rand = rng(11);
  const map = mistTexture();
  const puffs = Array.from({ length: 44 }, () => {
    const s = new THREE.Sprite(
      // Dark blue haze rather than white cloud: it veils the valley without lifting the night
      new THREE.SpriteMaterial({ map, color: '#2a4568', transparent: true, opacity: 0.2 + rand() * 0.22, depthWrite: false, fog: true })
    );
    const k = 50 + rand() * 90;
    s.scale.set(k, k * 0.45, 1);
    const a = rand() * Math.PI * 2;
    const r = rand() * 170;
    s.position.set(Math.cos(a) * r, 3 + rand() * 16, Math.sin(a) * r);
    s.material.rotation = (rand() - 0.5) * 0.3;
    group.add(s);
    return { s, speed: 0.6 + rand() * 1.2 };
  });
  return {
    group,
    tick(dt: number) {
      for (const p of puffs) {
        p.s.position.x += p.speed * dt;
        if (p.s.position.x > 190) p.s.position.x -= 380;
      }
    },
  };
}
