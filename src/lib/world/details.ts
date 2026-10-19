/**
 * Life on the labyrinth: everything that makes the walls feel old and lived-in,
 * scattered by the heightfield so it follows the maze pattern exactly.
 * - Moss cushions draped over the crests and along each wall's damp foot
 * - Low shrubs tucked into the flat wall tops
 * - Boulders fallen at the foot of the walls and along the channel banks
 * - Lily pads floating in the calm channels (a few in flower), bobbing gently
 * All instanced (one draw call per kind). Instance colours are the daylight
 * palette; by night a cool tint on each material sinks them into the blue.
 */
import * as THREE from 'three';
import { heightAt, fbm, WATER } from './terrain';
import { rng } from './nature';
import type { Place } from './places';

const INNER = 84; // only inside the maze

/** Ground normal from the heightfield */
function normalAt(x: number, z: number, out: THREE.Vector3) {
  const e = 0.3;
  return out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
}

/** Lumpy blob: a sphere whose vertices are pushed in and out so instances don't read as balls */
function lumpy(geo: THREE.BufferGeometry, rand: () => number, amount: number) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  // Shared vertices (same position) must move together or the surface tears
  const moved = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let k = moved.get(key);
    if (k === undefined) moved.set(key, (k = 1 + (rand() - 0.5) * amount));
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

type Spot = { x: number; y: number; z: number; n: THREE.Vector3 };

export function buildDetails(places: Place[]) {
  const rand = rng(23);
  const group = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  const tmpN = new THREE.Vector3();
  // Keep clear of the beacons so nothing sits in a beacon's light or under its orb
  const clearOfBeacons = (x: number, z: number, r: number) => places.every((p) => Math.hypot(p.x - x, p.z - z) > r);

  /** Rejection-sample spots inside the maze that pass `ok` */
  const scatter = (count: number, tries: number, ok: (s: Spot) => boolean) => {
    const out: Spot[] = [];
    for (let t = 0; out.length < count && t < tries; t++) {
      const a = rand() * Math.PI * 2;
      // sqrt: uniform over the disc, not bunched at the centre
      const r = Math.sqrt(rand()) * INNER;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = { x, z, y: heightAt(x, z), n: normalAt(x, z, tmpN).clone() };
      if (ok(s)) out.push(s);
    }
    return out;
  };

  const o = new THREE.Object3D();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const tinted: THREE.MeshStandardMaterial[] = [];
  const instanced = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, spots: Spot[], place: (s: Spot, i: number) => void, palette: string[]) => {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(spots.length, 1));
    mesh.count = spots.length;
    spots.forEach((s, i) => {
      place(s, i);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, col.set(palette[Math.floor(rand() * palette.length)]).multiplyScalar(0.85 + rand() * 0.3));
    });
    mesh.receiveShadow = true;
    tinted.push(mat);
    group.add(mesh);
    return mesh;
  };
  const mat = (opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, ...opts });

  /* Moss: cushions on the crests (dense where the terrain's own moss patches are) and a damp band at the foot */
  const mossSpots = scatter(2600, 60000, (s) => {
    const crest = s.y > 3.5 && s.n.y > 0.8;
    const damp = s.y > WATER + 0.15 && s.y < 2.6 && s.n.y > 0.45;
    if (!crest && !damp) return false;
    return fbm(s.x * 0.18 + 3, s.z * 0.18 - 7, 3) > 0.42 && clearOfBeacons(s.x, s.z, 2.5);
  });
  instanced(
    lumpy(new THREE.IcosahedronGeometry(1, 1), rand, 0.5),
    mat(),
    mossSpots,
    (s) => {
      // Drape over the slope: squash along the ground normal
      q.setFromUnitVectors(up, s.n);
      o.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up, rand() * Math.PI * 2));
      const k = 0.35 + rand() * 0.75;
      o.scale.set(k * (1 + rand() * 0.6), k * (0.22 + rand() * 0.18), k * (1 + rand() * 0.6));
      o.position.set(s.x, s.y + 0.02, s.z);
    },
    ['#4f6b2a', '#5f7d2f', '#3f5a26', '#6d8a35', '#56702c']
  );

  /* Shrubs: a few low bushes rooted in the flattest crest tops */
  const shrubSpots = scatter(420, 40000, (s) => s.y > 4.5 && s.n.y > 0.9 && rand() < 0.6 && clearOfBeacons(s.x, s.z, 3));
  const shrubs = instanced(
    lumpy(new THREE.IcosahedronGeometry(1, 0), rand, 0.45),
    mat({ flatShading: true }),
    shrubSpots,
    (s) => {
      const k = 0.45 + rand() * 0.55;
      o.quaternion.setFromAxisAngle(up, rand() * Math.PI * 2);
      o.scale.set(k * (0.9 + rand() * 0.4), k * (0.7 + rand() * 0.5), k * (0.9 + rand() * 0.4));
      o.position.set(s.x, s.y + k * 0.35, s.z);
    },
    ['#2f4a26', '#3a5a2c', '#34502a', '#44612f']
  );
  shrubs.castShadow = true;

  /* Boulders: fallen from the walls, resting at their foot and on the banks */
  const boulderSpots = scatter(650, 50000, (s) => s.y > WATER - 0.25 && s.y < 2.2 && s.n.y < 0.95 && clearOfBeacons(s.x, s.z, 3));
  const boulders = instanced(
    lumpy(new THREE.DodecahedronGeometry(1, 0), rand, 0.35),
    mat({ flatShading: true, roughness: 0.95 }),
    boulderSpots,
    (s) => {
      const k = 0.25 + Math.pow(rand(), 2.2) * 1.1;
      o.quaternion.setFromEuler(new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI));
      o.scale.set(k * (0.8 + rand() * 0.5), k * (0.55 + rand() * 0.35), k * (0.8 + rand() * 0.5));
      // Half sunk into the ground, like they've sat there a long time
      o.position.set(s.x, s.y - k * 0.2, s.z);
    },
    ['#5d5f5a', '#6b675e', '#4f524e', '#625f57']
  );
  boulders.castShadow = true;

  /* Lily pads: in clusters on calm, reasonably deep water */
  const padSpots: Spot[] = [];
  const seeds = scatter(26, 20000, (s) => s.y < WATER - 0.6 && clearOfBeacons(s.x, s.z, 6));
  for (const c of seeds) {
    const n = 4 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const x = c.x + (rand() - 0.5) * 3.2;
      const z = c.z + (rand() - 0.5) * 3.2;
      if (heightAt(x, z) < WATER - 0.35) padSpots.push({ x, z, y: WATER + 0.03, n: up });
    }
  }
  // A notched disc: the classic lily-pad split
  const padGeo = new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.35).rotateX(-Math.PI / 2);
  const padBase: { x: number; z: number; k: number; spin: number; phase: number }[] = [];
  const pads = instanced(
    padGeo,
    mat({ roughness: 0.6, side: THREE.DoubleSide }),
    padSpots,
    (s) => {
      const k = 0.35 + rand() * 0.4;
      const spin = rand() * Math.PI * 2;
      padBase.push({ x: s.x, z: s.z, k, spin, phase: rand() * 6 });
      o.quaternion.setFromAxisAngle(up, spin);
      o.scale.setScalar(k);
      o.position.set(s.x, s.y, s.z);
    },
    ['#4d7a33', '#5c8a3a', '#466f2e']
  );
  // A few in flower
  const flowerSpots = padSpots.filter(() => rand() < 0.18);
  instanced(
    lumpy(new THREE.IcosahedronGeometry(1, 0), rand, 0.3),
    mat({ roughness: 0.7, emissive: '#ffffff', emissiveIntensity: 0.06 }),
    flowerSpots,
    (s) => {
      o.quaternion.identity();
      o.scale.set(0.16, 0.12, 0.16);
      o.position.set(s.x + (rand() - 0.5) * 0.3, WATER + 0.12, s.z + (rand() - 0.5) * 0.3);
    },
    ['#f2c6d8', '#f7e0ea', '#efb0c8']
  );

  // Night: a cool, dim tint over the daylight colours so the details settle into the moonlit palette
  const NIGHT_TINT = new THREE.Color(0.42, 0.62, 0.95);
  const DAY_TINT = new THREE.Color(1, 1, 1);
  return {
    group,
    /** Lily pads ride the swell a little */
    tick(t: number) {
      if (!padBase.length) return;
      padBase.forEach((p, i) => {
        o.position.set(p.x, WATER + 0.03 + Math.sin(t * 1.2 + p.phase) * 0.025, p.z);
        o.quaternion.setFromAxisAngle(up, p.spin + Math.sin(t * 0.3 + p.phase) * 0.08);
        o.scale.setScalar(p.k);
        o.updateMatrix();
        pads.setMatrixAt(i, o.matrix);
      });
      pads.instanceMatrix.needsUpdate = true;
    },
    /** 0 = night, 1 = day */
    setDay(k: number) {
      for (const m of tinted) m.color.lerpColors(NIGHT_TINT, DAY_TINT, k);
    },
  };
}
