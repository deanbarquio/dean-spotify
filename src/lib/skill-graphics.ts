/** Inline SVG graphics for Skills section — category & track icons */

export type SkillGraphic = {
  icon: string;
  decor: string;
  mesh: string;
};

export const categoryGraphics: Record<string, SkillGraphic> = {
  web: {
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 18h40v28H12V18z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 28l8 8 12-16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="22" r="4" fill="currentColor" opacity="0.5"/></svg>`,
    decor: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 60 Q60 10 110 60 Q60 110 10 60" stroke="currentColor" stroke-width="1.5" opacity="0.25"/><path d="M30 60h60M60 30v60" stroke="currentColor" stroke-width="1" opacity="0.15"/></svg>`,
    mesh: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><pattern id="sk-mesh-web" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.12"/></pattern></defs><rect width="200" height="200" fill="url(#sk-mesh-web)"/></svg>`,
  },
  mobile: {
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="20" y="8" width="24" height="48" rx="4" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="48" r="3" fill="currentColor"/><rect x="26" y="14" width="12" height="22" rx="1" fill="currentColor" opacity="0.35"/></svg>`,
    decor: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="35" y="20" width="50" height="80" rx="8" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><path d="M20 40h15M85 40h15" stroke="currentColor" stroke-width="1" opacity="0.15"/></svg>`,
    mesh: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="100" cy="100" r="70" stroke="currentColor" stroke-width="0.5" fill="none" opacity="0.1"/><circle cx="100" cy="100" r="45" stroke="currentColor" stroke-width="0.5" fill="none" opacity="0.08"/><circle cx="100" cy="100" r="20" stroke="currentColor" stroke-width="0.5" fill="none" opacity="0.06"/></svg>`,
  },
  databases: {
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="32" cy="18" rx="18" ry="7" stroke="currentColor" stroke-width="2.5"/><path d="M14 18v28c0 4 8 7 18 7s18-3 18-7V18" stroke="currentColor" stroke-width="2.5"/><ellipse cx="32" cy="32" rx="18" ry="7" stroke="currentColor" stroke-width="2" opacity="0.5"/><ellipse cx="32" cy="46" rx="18" ry="7" stroke="currentColor" stroke-width="2" opacity="0.35"/></svg>`,
    decor: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="60" cy="35" rx="35" ry="12" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><ellipse cx="60" cy="60" rx="35" ry="12" stroke="currentColor" stroke-width="1" opacity="0.15"/><ellipse cx="60" cy="85" rx="35" ry="12" stroke="currentColor" stroke-width="1" opacity="0.1"/></svg>`,
    mesh: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 100h200M100 0v200" stroke="currentColor" stroke-width="0.5" opacity="0.08"/><path d="M0 50h200M0 150h200" stroke="currentColor" stroke-width="0.5" opacity="0.05"/></svg>`,
  },
  cloud: {
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 44h32a10 10 0 000-20 14 14 0 00-27-4 12 12 0 00-5 24z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 38l4 4 8-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    decor: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M25 70h70a15 15 0 000-30 20 20 0 00-38-6 16 16 0 00-32 36z" stroke="currentColor" stroke-width="1.5" opacity="0.18"/></svg>`,
    mesh: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polygon points="100,20 180,60 180,140 100,180 20,140 20,60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1"/></svg>`,
  },
  apis: {
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="16" cy="32" r="6" stroke="currentColor" stroke-width="2.5"/><circle cx="48" cy="16" r="6" stroke="currentColor" stroke-width="2.5"/><circle cx="48" cy="48" r="6" stroke="currentColor" stroke-width="2.5"/><path d="M22 30l20-12M22 34l20 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    decor: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="30" cy="60" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><circle cx="90" cy="30" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><circle cx="90" cy="90" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><path d="M38 56L82 36M38 64L82 84" stroke="currentColor" stroke-width="1" opacity="0.12"/></svg>`,
    mesh: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 20l160 160M180 20L20 180" stroke="currentColor" stroke-width="0.5" opacity="0.08"/></svg>`,
  },
};

export const trackIcons: Record<string, string> = {
  Angular: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 6.5v11L12 22l10-4.5v-11L12 2zm0 2.2l7.8 3.5v8.6L12 19.8l-7.8-3.5V7.7L12 4.2z"/></svg>`,
  'React / Next.js': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>`,
  NestJS: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 8v8l8 5 8-5V8l-8-5zm0 3l5 3.1v5.8L12 18l-5-3.1V9.1L12 6z"/></svg>`,
  TailwindCSS: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c-3.5 0-5.7 1.75-6.6 5.25 1.3-1.75 2.8-2.4 4.5-1.95 1 .25 1.7.95 2.5 1.75.95 1 2.05 2.15 4.45 2.15 3.5 0 5.7-1.75 6.6-5.25-1.3 1.75-2.8 2.4-4.5 1.95-1-.25-1.7-.95-2.5-1.75C14.5 7.2 13.4 6.05 12 6zm-6.6 7.5C2.9 13.5.7 15.25 0 18.75c1.3-1.75 2.8-2.4 4.5-1.95 1 .25 1.7.95 2.5 1.75.95 1 2.05 2.15 4.45 2.15 3.5 0 5.7-1.75 6.6-5.25-1.3 1.75-2.8 2.4-4.5 1.95-1-.25-1.7-.95-2.5-1.75-.95-1-2.05-2.15-4.45-2.15z"/></svg>`,
  TypeScript: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><path fill="#121212" d="M8 11h2v6H8zm6-1.5c-1.2 0-2 .6-2.2 1.5h2c0-.2.2-.4.6-.4.5 0 .7.3.7.7v.3h-1.2c-1.4 0-2.2.7-2.2 1.8 0 1.1.8 1.7 2 1.7 1 0 1.6-.4 2-.9v.8h2v-4.5c0-1.4-.9-2.2-2.7-2.2z"/></svg>`,
  Flutter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7l9 9-4.5 4.5L4 4zm0 8.5L11.5 20H20l-8-8H4z"/></svg>`,
  Docker: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 10h2v2H4v-2zm3 0h2v2H7v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-9 3h2v2H4v-2zm3 0h2v2H7v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-12 3h14c1.5 0 3-1.2 3.5-3H4c.5 1.8 2 3 3.5 3z"/></svg>`,
  'Prisma / MySQL': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C8 3 5 5 5 8v8c0 3 3 5 7 5s7-2 7-5V8c0-3-3-5-7-5zm0 2c2.8 0 5 1.5 5 3v1H7V8c0-1.5 2.2-3 5-3z"/></svg>`,
};

export function getTrackIcon(skill: string): string {
  return trackIcons[skill] ?? `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>`;
}
