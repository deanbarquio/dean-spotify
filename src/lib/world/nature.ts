/**
 * Atmosphere: tiered pine stands on the outer slopes (instanced) and big soft
 * mist billboards drifting through the valley.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  // Foliage and trunk share each instance's matrix; foliage colour drifts per tree so stands don't read as one flat mass
  const crown = new THREE.InstancedMesh(
    pineCrown(rand),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
    spots.length
  );
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.06, 0.09, 0.16, 6).translate(0, 0.08, 0),
    new THREE.MeshStandardMaterial({ color: '#140f0d', roughness: 1 }),
    spots.length
  );
  const deep = new THREE.Color('#0c1c20');
  const moss = new THREE.Color('#1a3628');
  const tint = new THREE.Color();
  const o = new THREE.Object3D();
  spots.forEach((s, i) => {
    // Stout proportions (about 1 wide : 2.3 tall) so the stepped silhouette reads at a distance
    const k = 1.2 + rand() * 1.1;
    o.position.set(s.x, s.y - 0.3, s.z);
    o.rotation.set((rand() - 0.5) * 0.06, rand() * Math.PI * 2, (rand() - 0.5) * 0.06);
    o.scale.set(k, k * (2.6 + rand() * 1.0), k);
    o.updateMatrix();
    crown.setMatrixAt(i, o.matrix);
    trunk.setMatrixAt(i, o.matrix);
    crown.setColorAt(i, tint.copy(deep).lerp(moss, rand() * 0.8));
  });
  const group = new THREE.Group();
  for (const m of [crown, trunk]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  // By day the material colour lifts every instance tint (a multiplier above 1) toward sunlit evergreen
  const crownMat = crown.material as THREE.MeshStandardMaterial;
  const trunkMat = trunk.material as THREE.MeshStandardMaterial;
  const NIGHT_LIFT = new THREE.Color(1, 1, 1);
  const DAY_LIFT = new THREE.Color(2.3, 2.7, 2.1);
  const NIGHT_BARK = new THREE.Color('#140f0d');
  const DAY_BARK = new THREE.Color('#4a3727');
  return {
    group,
    /** 0 = night, 1 = day */
    setDay(k: number) {
      crownMat.color.lerpColors(NIGHT_LIFT, DAY_LIFT, k);
      trunkMat.color.lerpColors(NIGHT_BARK, DAY_BARK, k);
    },
  };
}

/**
 * Pine silhouette, unit tall: stacked whorls that narrow toward a spire, each
 * skirt ragged and drooping so the outline reads as boughs rather than a cone.
 */
function pineCrown(rand: () => number) {
  const tiers = 5;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    // Broad shelves stepping in sharply, so each whorl overhangs the one above it
    const radius = 0.66 - t * 0.46;
    const height = 0.3 - t * 0.06;
    const base = 0.1 + t * 0.62;
    const g = new THREE.ConeGeometry(radius, height, 10, 1, true);
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      // Skirt ring only (the tip stays sharp): jag the reach and let the bough tips sag
      if (pos.getY(v) > 0) continue;
      const reach = 0.85 + rand() * 0.4;
      pos.setXYZ(v, pos.getX(v) * reach, pos.getY(v) - (0.03 + rand() * 0.07) * reach, pos.getZ(v) * reach);
    }
    g.rotateY(rand() * Math.PI);
    g.translate(0, base + height / 2, 0);
    parts.push(g.toNonIndexed());
  }
  const merged = mergeGeometries(parts)!;
  merged.computeVertexNormals();
  return merged;
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
    return { s, speed: 0.6 + rand() * 1.2, opacity: s.material.opacity };
  });
  const night = new THREE.Color('#2a4568');
  const day = new THREE.Color('#c9d9e4');
  return {
    group,
    tick(dt: number) {
      for (const p of puffs) {
        p.s.position.x += p.speed * dt;
        if (p.s.position.x > 190) p.s.position.x -= 380;
      }
    },
    /** 0 = night haze, 1 = clear day: the mist burns off entirely */
    setDay(k: number) {
      for (const p of puffs) {
        p.s.material.color.lerpColors(night, day, k);
        p.s.material.opacity = p.opacity * (1 - k);
      }
      group.visible = k < 1;
    },
  };
}
