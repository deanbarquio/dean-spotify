/**
 * Time-aware greeting set in Pacifico (connected script, SIL OFL, self-hosted)
 * and built as inflated glass letters: thin slab, deep rounded bevel, so the
 * strokes read as puffy tubes and the refraction gathers at the rims.
 */
import * as THREE from 'three';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export type Daypart = 'morning' | 'afternoon' | 'evening';

/** Visitor's local time: 05–11 morning, 12–17 afternoon, otherwise evening */
export function daypart(date = new Date()): Daypart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

const LABEL: Record<Daypart, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

let fontPromise: Promise<Font> | null = null;
export function loadGreetingFont(url = '/fonts/pacifico.ttf') {
  fontPromise ??= new TTFLoader().loadAsync(url).then((json) => new Font(json));
  return fontPromise;
}

function line(text: string, font: Font) {
  const g = new TextGeometry(text, {
    font,
    size: 1,
    depth: 0.22,
    curveSegments: 18,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 10,
  });
  g.center();
  return g;
}

/** "Good <Daypart>" on one line (wide screens) or stacked (narrow); centred on the origin */
export function greetingGroup(part: Daypart, material: THREE.Material, oneLine: boolean, font: Font) {
  const group = new THREE.Group();
  const texts = oneLine ? [`Good ${LABEL[part]}`] : ['Good', LABEL[part]];
  const lead = 1.5; // script ascenders/descenders need more room than a sans
  texts.forEach((t, i) => {
    const mesh = new THREE.Mesh(line(t, font), material);
    mesh.position.y = ((texts.length - 1) / 2 - i) * lead;
    group.add(mesh);
  });
  return group;
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
}
