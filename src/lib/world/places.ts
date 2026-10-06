/**
 * Every stop in the valley: a glowing beacon per project, plus home (about)
 * at the heart of the labyrinth and contact on the outer ring. Positions are
 * polar (ring radius r, angle a in degrees) so they sit in the maze valleys.
 */
import { projects } from '../../data/portfolio';

export type Place = { id: string; label: string; sub: string; x: number; z: number; paint: string };

/** Valley radii between the labyrinth ridges (see terrain RINGS) */
const SPOTS: Record<string, { r: number; a: number }> = {
  fenghuang: { r: 27, a: 205 },
  'fire-and-blood': { r: 27, a: 330 },
  'meeting-room': { r: 27, a: 95 },
  constrack: { r: 45, a: 160 },
  'control-panel': { r: 45, a: 15 },
  'ntv-dashboard': { r: 45, a: 255 },
  psits: { r: 45, a: 115 },
  'component-pantry': { r: 63, a: 135 },
  buildit: { r: 63, a: 215 },
  hikemate: { r: 63, a: 300 },
};

const polar = (r: number, a: number) => ({ x: r * Math.cos((a * Math.PI) / 180), z: r * Math.sin((a * Math.PI) / 180) });

export const PLACES: Place[] = [
  { id: 'about', label: 'Home', sub: 'About Dean', x: 0, z: 0, paint: '#7fd8ff' },
  // A project without a spot stays out of the valley until it gets one
  ...projects.flatMap((p) => {
    const s = SPOTS[p.id];
    return s ? [{ id: p.id, label: p.title, sub: p.kind, ...polar(s.r, s.a), paint: p.paint }] : [];
  }),
  { id: 'contact', label: 'Signal', sub: 'Say hi', ...polar(63, 50), paint: '#ff5ab4' },
];
