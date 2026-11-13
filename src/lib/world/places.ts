/**
 * Every stop in the valley: a glowing beacon per project, plus home (about)
 * at the heart of the labyrinth. Contact lives on the page itself, not in the valley. Positions are
 * polar (ring radius r, angle a in degrees) so they sit in the maze valleys.
 */
import { projects, type Element } from '../../data/portfolio';

/** Home at the heart of the valley holds every element at once */
export type PlaceElement = Element | 'spirit';
export type Place = { id: string; label: string; sub: string; x: number; z: number; paint: string; element: PlaceElement; featured?: boolean };

export const ELEMENT_NAME: Record<PlaceElement, string> = { fire: 'Fire', water: 'Water', earth: 'Earth', air: 'Air', spirit: 'All four' };

/** The four elements as the hero tells them: the word each one gives the headline, its colour and glyph (24×24 stroke path) */
export const ELEMENTS: { id: Element; word: string; color: string; glyph: string }[] = [
  { id: 'air', word: 'move', color: '#b9d3ee', glyph: 'M3 8.5h10.5a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7' },
  { id: 'water', word: 'flow', color: '#3fb6e6', glyph: 'M12 3.2c3.2 4.4 6 7.7 6 10.8a6 6 0 0 1-12 0c0-3.1 2.8-6.4 6-10.8ZM9.2 14.6a2.9 2.9 0 0 0 2.8 2.6' },
  { id: 'earth', word: 'endure', color: '#9cc25a', glyph: 'M2.5 19.5 9 8.5l3.6 5.6 2.6-3.6 6.3 9M7.2 11.6l1.8 1.4 1.4-1' },
  { id: 'fire', word: 'ignite', color: '#ff7a2a', glyph: 'M12 2.8c.8 3.6 4.8 5.6 4.8 10.4a4.8 4.8 0 0 1-9.6 0c0-2.6 1.6-3.8 1.8-6.4 1.4 1 2 2.4 2 3.8.9-1 1.5-3.8 1-7.8ZM12 20.2a2 2 0 0 1-2-2c0-1.3 1.2-2 2-3.4.8 1.4 2 2.1 2 3.4a2 2 0 0 1-2 2Z' },
];

/** Valley radii between the labyrinth ridges (see terrain RINGS) */
const SPOTS: Record<string, { r: number; a: number }> = {
  fenghuang: { r: 27, a: 205 },
  'fire-and-blood': { r: 27, a: 330 },
  'meeting-room': { r: 27, a: 95 },
  'class-record': { r: 27, a: 35 },
  'iron-spider': { r: 27, a: 150 },
  constrack: { r: 45, a: 160 },
  'control-panel': { r: 45, a: 15 },
  'character-showcase': { r: 45, a: 255 },
  psits: { r: 45, a: 115 },
  'vault-budget': { r: 45, a: 315 },
  'component-pantry': { r: 63, a: 135 },
  buildit: { r: 63, a: 215 },
  hikemate: { r: 63, a: 300 },
  'psits-finance': { r: 63, a: 40 },
};

const polar = (r: number, a: number) => ({ x: r * Math.cos((a * Math.PI) / 180), z: r * Math.sin((a * Math.PI) / 180) });

export const PLACES: Place[] = [
  { id: 'about', label: 'Home', sub: 'About Dean', x: 0, z: 0, paint: '#7fd8ff', element: 'spirit' },
  // A project without a spot stays out of the valley until it gets one
  ...projects.flatMap((p) => {
    const s = SPOTS[p.id];
    return s ? [{ id: p.id, label: p.title, sub: p.kind, ...polar(s.r, s.a), paint: p.paint, element: p.element, featured: p.featured }] : [];
  }),
];
