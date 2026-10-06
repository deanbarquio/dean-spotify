/**
 * Original die-cut sticker set (SVG → canvas textures) scattered behind the
 * glass objects. Each sticker = white silhouette ("cut") + artwork on top.
 */
type Sticker = { id: string; cut: string; art: string };

const INK = '#141a2b';

/** Pixel-art pointing hand: X = outline, o = fill */
const HAND = [
  '....XX.......',
  '...XooX......',
  '...XooX......',
  '...XooXXX....',
  '...XooXooXX..',
  '.XXXooXooXoX.',
  'XooXooooooooX',
  'XooXooooooooX',
  '.XooooooooooX',
  '..XoooooooooX',
  '..XooooooooX.',
  '...XoooooooX.',
  '...XoooooooX.',
  '....XXXXXXX..',
];
const pixelHand = () => {
  const c = 12;
  const ox = 22;
  const oy = 16;
  let cut = '';
  let art = '';
  HAND.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const r = `<rect x="${ox + x * c}" y="${oy + y * c}" width="${c + 0.5}" height="${c + 0.5}"`;
      cut += `${r}/>`;
      art += `${r} fill="${ch === 'X' ? '#1b3fbf' : '#e9f1ff'}"/>`;
    })
  );
  return { cut, art };
};
const hand = pixelHand();

const STICKERS: Sticker[] = [
  {
    id: 'smile',
    cut: '<circle cx="100" cy="100" r="80"/>',
    art: `<circle cx="100" cy="100" r="78" fill="#ffc21a" stroke="${INK}" stroke-width="5"/>
      <circle cx="100" cy="100" r="64" fill="none" stroke="#ffdb6b" stroke-width="6" opacity=".7"/>
      <ellipse cx="74" cy="84" rx="9" ry="17" fill="${INK}" transform="rotate(-14 74 84)"/>
      <ellipse cx="126" cy="84" rx="9" ry="17" fill="${INK}" transform="rotate(14 126 84)"/>
      <path d="M56 116 Q100 166 144 116" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`,
  },
  {
    id: 'eyes',
    cut: '<circle cx="68" cy="104" r="52"/><circle cx="136" cy="94" r="56"/>',
    art: `<circle cx="68" cy="104" r="50" fill="#fff" stroke="${INK}" stroke-width="6"/>
      <circle cx="136" cy="94" r="54" fill="#fff" stroke="${INK}" stroke-width="6"/>
      <circle cx="80" cy="112" r="24" fill="#6cc46a" stroke="${INK}" stroke-width="4"/>
      <circle cx="148" cy="104" r="26" fill="#6cc46a" stroke="${INK}" stroke-width="4"/>
      <circle cx="84" cy="114" r="13" fill="${INK}"/><circle cx="152" cy="106" r="14" fill="${INK}"/>
      <circle cx="78" cy="106" r="5" fill="#fff"/><circle cx="146" cy="98" r="5" fill="#fff"/>`,
  },
  { id: 'hand', cut: hand.cut, art: hand.art },
  {
    id: 'heart',
    cut: '<path d="M100 172 C40 128 16 96 30 62 C44 30 84 30 100 60 C116 30 156 30 170 62 C184 96 160 128 100 172Z"/>',
    art: `<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4f9a"/><stop offset="1" stop-color="#ff2a3d"/></linearGradient></defs>
      <path d="M100 172 C40 128 16 96 30 62 C44 30 84 30 100 60 C116 30 156 30 170 62 C184 96 160 128 100 172Z" fill="url(#hg)"/>
      <ellipse cx="62" cy="66" rx="16" ry="9" fill="#fff" opacity=".55" transform="rotate(-35 62 66)"/>`,
  },
  {
    id: 'arrow',
    cut: '<path d="M58 26 L58 162 L94 130 L120 182 L146 170 L120 120 L168 118Z"/>',
    art: `<defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa2ff"/><stop offset="1" stop-color="#1b4fd8"/></linearGradient></defs>
      <path d="M58 26 L58 162 L94 130 L120 182 L146 170 L120 120 L168 118Z" fill="url(#ag)" stroke="#0b2a7a" stroke-width="5" stroke-linejoin="round"/>
      <path d="M70 52 L70 128" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`,
  },
  {
    id: 'badge',
    cut: '<circle cx="100" cy="100" r="88"/>',
    art: `<defs><path id="bp" d="M100 100 m-66 0 a66 66 0 1 1 132 0 a66 66 0 1 1 -132 0"/></defs>
      <circle cx="100" cy="100" r="86" fill="#f2e7cf" stroke="#2a2620" stroke-width="4"/>
      <circle cx="100" cy="100" r="52" fill="none" stroke="#2a2620" stroke-width="3"/>
      <ellipse cx="100" cy="100" rx="22" ry="52" fill="none" stroke="#2a2620" stroke-width="2"/>
      <path d="M48 100 H152 M56 74 H144 M56 126 H144" stroke="#2a2620" stroke-width="2"/>
      <text font-family="Courier New, monospace" font-size="15" font-weight="700" letter-spacing="3" fill="#2a2620"><textPath href="#bp">DEAN BARQUIO · CEBU · 2026 ·</textPath></text>
      <rect x="66" y="88" width="68" height="26" fill="#f2e7cf" stroke="#2a2620" stroke-width="2.5"/>
      <text x="100" y="108" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="19" font-weight="900" fill="#2a2620">DB</text>`,
  },
  {
    id: 'star',
    cut: '<path d="M100 18 C110 76 124 90 182 100 C124 110 110 124 100 182 C90 124 76 110 18 100 C76 90 90 76 100 18Z"/>',
    art: `<path d="M100 18 C110 76 124 90 182 100 C124 110 110 124 100 182 C90 124 76 110 18 100 C76 90 90 76 100 18Z" fill="#ffd23f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="86" cy="80" r="6" fill="#fff" opacity=".8"/>`,
  },
  {
    id: 'bolt',
    cut: '<path d="M116 16 L48 112 L94 112 L80 186 L154 82 L106 82Z"/>',
    art: `<path d="M116 16 L48 112 L94 112 L80 186 L154 82 L106 82Z" fill="#ffa51f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M104 42 L72 96" stroke="#ffe08a" stroke-width="6" stroke-linecap="round"/>`,
  },
  {
    id: 'code',
    cut: '<rect x="20" y="52" width="160" height="96" rx="26"/>',
    art: `<rect x="20" y="52" width="160" height="96" rx="26" fill="#121a3a" stroke="${INK}" stroke-width="4"/>
      <text x="100" y="118" text-anchor="middle" font-family="Courier New, monospace" font-size="52" font-weight="700" fill="#7fd1ff">&lt;/&gt;</text>`,
  },
  {
    id: 'flower',
    cut: '<circle cx="100" cy="100" r="84"/>',
    art: `<g fill="#3ddc84" stroke="${INK}" stroke-width="5">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="100" cy="52" rx="22" ry="34" transform="rotate(${i * 45} 100 100)"/>`).join('')}</g>
      <circle cx="100" cy="100" r="30" fill="#c7ff6b" stroke="${INK}" stroke-width="5"/>
      <path d="M100 100 m0 -14 a14 14 0 1 1 -12 7 a8 8 0 1 1 8 -4" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: 'pen',
    cut: '<path d="M100 16 L150 92 L132 168 L68 168 L50 92Z"/><rect x="62" y="160" width="76" height="26" rx="6"/>',
    art: `<path d="M100 16 L150 92 L132 160 L68 160 L50 92Z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M100 18 V96" stroke="${INK}" stroke-width="5"/><circle cx="100" cy="106" r="12" fill="#fff" stroke="${INK}" stroke-width="5"/>
      <rect x="62" y="160" width="76" height="24" rx="6" fill="#4d8dff" stroke="${INK}" stroke-width="5"/>`,
  },
  {
    id: 'hi',
    cut: '<path d="M32 40 H168 a16 16 0 0 1 16 16 V124 a16 16 0 0 1 -16 16 H92 L58 172 L64 140 H32 a16 16 0 0 1 -16 -16 V56 a16 16 0 0 1 16 -16Z"/>',
    art: `<path d="M32 40 H168 a16 16 0 0 1 16 16 V124 a16 16 0 0 1 -16 16 H92 L58 172 L64 140 H32 a16 16 0 0 1 -16 -16 V56 a16 16 0 0 1 16 -16Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <text x="100" y="114" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="50" font-weight="900" fill="#1f6bff">hi!</text>`,
  },
];

export const STICKER_IDS = STICKERS.map((s) => s.id);

const svgOf = (s: Sticker) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
  `<g fill="#fff" stroke="#fff" stroke-width="18" stroke-linejoin="round">${s.cut}</g>${s.art}</svg>`;

/** Rasterise every sticker with a soft drop shadow; resolves to id → canvas */
export async function rasterStickers(size = 384) {
  const out = new Map<string, HTMLCanvasElement>();
  await Promise.all(
    STICKERS.map(async (s) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOf(s))}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      const pad = size * 0.1;
      ctx.shadowColor = 'rgba(12, 40, 100, 0.28)';
      ctx.shadowBlur = size * 0.04;
      ctx.shadowOffsetY = size * 0.025;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      out.set(s.id, c);
    })
  );
  return out;
}

/** Placement relative to an anchor section: x/y as fractions of the viewport
 *  (y measured from the section top), size in css px, rotation in degrees,
 *  depth in [-1, 1] drives parallax. */
export type Spot = { id: string; x: number; y: number; s: number; r: number; d: number };

export const HERO_SPOTS: Spot[] = [
  { id: 'eyes', x: 0.6, y: 0.2, s: 130, r: -12, d: 0.6 },
  { id: 'hand', x: 0.44, y: 0.36, s: 120, r: -18, d: 0.2 },
  { id: 'smile', x: 0.4, y: 0.74, s: 140, r: 12, d: 0.5 },
  { id: 'badge', x: 0.82, y: 0.58, s: 175, r: 18, d: 0.3 },
  { id: 'heart', x: 0.86, y: 0.38, s: 115, r: -14, d: 0.8 },
  { id: 'arrow', x: 0.9, y: 0.78, s: 125, r: -22, d: -0.4 },
  { id: 'flower', x: 0.7, y: 0.4, s: 120, r: 8, d: -0.2 },
  { id: 'star', x: 0.56, y: 0.8, s: 95, r: 12, d: 0.9 },
  { id: 'code', x: 0.63, y: 0.94, s: 135, r: -8, d: 0.1 },
  { id: 'pen', x: 0.96, y: 0.96, s: 120, r: 22, d: -0.6 },
  { id: 'hi', x: 0.27, y: 0.46, s: 115, r: -6, d: 0.4 },
  { id: 'bolt', x: 0.51, y: 0.56, s: 100, r: 16, d: -0.5 },
  { id: 'smile', x: 0.75, y: 0.86, s: 110, r: -14, d: 0.7 },
  { id: 'heart', x: 0.98, y: 0.2, s: 82, r: 10, d: -0.8 },
];

export const FOOTER_SPOTS: Spot[] = [
  { id: 'heart', x: 0.14, y: 0.26, s: 110, r: -12, d: 0.6 },
  { id: 'badge', x: 0.86, y: 0.22, s: 160, r: 14, d: 0.3 },
  { id: 'eyes', x: 0.1, y: 0.72, s: 120, r: 8, d: -0.4 },
  { id: 'arrow', x: 0.9, y: 0.66, s: 115, r: -20, d: 0.8 },
  { id: 'star', x: 0.48, y: 0.12, s: 85, r: 10, d: -0.6 },
  { id: 'smile', x: 0.32, y: 0.82, s: 105, r: -10, d: 0.4 },
];
