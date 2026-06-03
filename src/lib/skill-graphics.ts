/** Skill playlist poster art + track icons */

export const categoryPosters: Record<string, string> = {
  web: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="poster-web-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="55%" stop-color="#2563eb"/>
        <stop offset="100%" stop-color="#7dd3fc"/>
      </linearGradient>
      <linearGradient id="poster-web-b" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#172554"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
      <filter id="poster-web-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g class="js-poster-shapes" filter="url(#poster-web-glow)">
      <ellipse class="js-poster-shape" cx="200" cy="200" rx="128" ry="46" fill="url(#poster-web-a)" opacity="0.95" transform="rotate(-32 200 200)"/>
      <ellipse class="js-poster-shape" cx="200" cy="200" rx="128" ry="46" fill="url(#poster-web-b)" opacity="0.9" transform="rotate(28 200 200)"/>
      <ellipse class="js-poster-shape" cx="200" cy="200" rx="128" ry="46" fill="url(#poster-web-a)" opacity="0.88" transform="rotate(88 200 200)"/>
    </g>
    <g class="js-poster-core">
      <circle cx="200" cy="200" r="52" fill="#0a0a0a" opacity="0.9"/>
      <text x="200" y="188" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="11" font-weight="500" letter-spacing="0.35em" font-family="system-ui,sans-serif">STACK</text>
      <text x="200" y="228" text-anchor="middle" fill="#fff" font-size="28" font-weight="800" letter-spacing="0.12em" font-family="system-ui,sans-serif">WEB</text>
    </g>
  </svg>`,

  mobile: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="poster-mob-a" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#052e16"/>
        <stop offset="40%" stop-color="#15803d"/>
        <stop offset="100%" stop-color="#4ade80"/>
      </linearGradient>
      <linearGradient id="poster-mob-b" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#14532d"/>
        <stop offset="100%" stop-color="#86efac"/>
      </linearGradient>
    </defs>
    <g class="js-poster-shapes">
      <polygon class="js-poster-shape" points="200,48 320,168 80,168" fill="url(#poster-mob-a)" opacity="0.85"/>
      <polygon class="js-poster-shape" points="200,108 300,208 100,208" fill="url(#poster-mob-b)" opacity="0.9"/>
      <polygon class="js-poster-shape" points="200,168 280,248 120,248" fill="url(#poster-mob-a)" opacity="0.95"/>
      <polygon class="js-poster-shape" points="200,228 260,288 140,288" fill="url(#poster-mob-b)" opacity="1"/>
      <polygon class="js-poster-shape" points="200,278 240,318 160,318" fill="url(#poster-mob-a)" opacity="0.7"/>
    </g>
    <text x="48" y="360" fill="#fff" font-size="26" font-weight="800" letter-spacing="0.06em" font-family="system-ui,sans-serif">MOBILE</text>
    <text x="48" y="382" fill="rgba(255,255,255,0.4)" font-size="10" font-weight="500" letter-spacing="0.2em" font-family="system-ui,sans-serif">GRADIENT DESIGN</text>
    <text x="360" y="56" fill="rgba(255,255,255,0.25)" font-size="9" font-weight="600" letter-spacing="0.25em" font-family="system-ui,sans-serif" transform="rotate(90 360 56)">FLOW</text>
  </svg>`,

  databases: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="poster-db-a" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#431407"/>
        <stop offset="50%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#fdba74"/>
      </linearGradient>
      <linearGradient id="poster-db-b" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#fb923c"/>
      </linearGradient>
    </defs>
    <g class="js-poster-shapes">
      <ellipse class="js-poster-shape" cx="200" cy="118" rx="140" ry="36" fill="url(#poster-db-a)" opacity="0.75"/>
      <ellipse class="js-poster-shape" cx="200" cy="168" rx="152" ry="40" fill="url(#poster-db-b)" opacity="0.88"/>
      <ellipse class="js-poster-shape" cx="200" cy="220" rx="164" ry="44" fill="url(#poster-db-a)" opacity="0.95"/>
      <ellipse class="js-poster-shape" cx="200" cy="276" rx="176" ry="48" fill="url(#poster-db-b)" opacity="1"/>
      <ellipse class="js-poster-shape" cx="200" cy="332" rx="148" ry="38" fill="url(#poster-db-a)" opacity="0.65"/>
    </g>
    <text x="40" y="368" fill="#fff" font-size="24" font-weight="800" letter-spacing="0.08em" font-family="system-ui,sans-serif">DATA</text>
    <text x="40" y="388" fill="rgba(255,255,255,0.38)" font-size="10" font-weight="500" letter-spacing="0.18em" font-family="system-ui,sans-serif">LAYERS · STORE</text>
  </svg>`,

  cloud: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="poster-cl-a" x1="50%" y1="50%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1a0510"/>
        <stop offset="50%" stop-color="#9f1239"/>
        <stop offset="100%" stop-color="#fb7185"/>
      </linearGradient>
      <linearGradient id="poster-cl-b" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#450a0a"/>
        <stop offset="100%" stop-color="#f43f5e"/>
      </linearGradient>
      <radialGradient id="poster-cl-void" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0a0a0a"/>
        <stop offset="70%" stop-color="#0a0a0a"/>
        <stop offset="100%" stop-color="#1a0510"/>
      </radialGradient>
      <filter id="poster-cl-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g class="js-poster-shapes" filter="url(#poster-cl-glow)" transform="translate(200 200)">
      <g class="js-poster-shape" opacity="0.94"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-a)"/></g>
      <g class="js-poster-shape" opacity="0.9" transform="rotate(60)"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-b)"/></g>
      <g class="js-poster-shape" opacity="0.94" transform="rotate(120)"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-a)"/></g>
      <g class="js-poster-shape" opacity="0.88" transform="rotate(180)"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-b)"/></g>
      <g class="js-poster-shape" opacity="0.92" transform="rotate(240)"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-a)"/></g>
      <g class="js-poster-shape" opacity="0.9" transform="rotate(300)"><path d="M0 0 L0 -148 A148 148 0 0 1 128.19 -74 Z" fill="url(#poster-cl-b)"/></g>
    </g>
    <g class="js-poster-core">
      <circle cx="200" cy="200" r="58" fill="url(#poster-cl-void)"/>
      <circle cx="200" cy="200" r="58" fill="none" stroke="rgba(244,63,94,0.35)" stroke-width="1"/>
      <text x="200" y="192" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-weight="600" letter-spacing="0.24em" font-family="system-ui,sans-serif">INFRA</text>
      <text x="200" y="222" text-anchor="middle" fill="#fff" font-size="24" font-weight="800" letter-spacing="0.12em" font-family="system-ui,sans-serif">CLOUD</text>
    </g>
  </svg>`,

  apis: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="poster-api-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#134e4a"/>
        <stop offset="50%" stop-color="#0d9488"/>
        <stop offset="100%" stop-color="#5eead4"/>
      </linearGradient>
      <linearGradient id="poster-api-b" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#042f2e"/>
        <stop offset="100%" stop-color="#2dd4bf"/>
      </linearGradient>
    </defs>
    <g class="js-poster-shapes">
      <circle class="js-poster-shape" cx="120" cy="200" r="36" fill="url(#poster-api-a)" opacity="0.9"/>
      <circle class="js-poster-shape" cx="280" cy="120" r="32" fill="url(#poster-api-b)" opacity="0.85"/>
      <circle class="js-poster-shape" cx="280" cy="280" r="40" fill="url(#poster-api-a)" opacity="0.95"/>
      <path class="js-poster-shape" d="M152 188 L248 132" stroke="url(#poster-api-b)" stroke-width="14" stroke-linecap="round" opacity="0.7"/>
      <path class="js-poster-shape" d="M152 212 L248 268" stroke="url(#poster-api-a)" stroke-width="14" stroke-linecap="round" opacity="0.75"/>
      <path class="js-poster-shape" d="M248 152 L248 248" stroke="url(#poster-api-b)" stroke-width="10" stroke-linecap="round" opacity="0.5" stroke-dasharray="4 12"/>
      <ellipse class="js-poster-shape" cx="200" cy="200" rx="90" ry="90" fill="none" stroke="url(#poster-api-a)" stroke-width="2" opacity="0.25"/>
    </g>
    <text x="200" y="368" text-anchor="middle" fill="#fff" font-size="24" font-weight="800" letter-spacing="0.1em" font-family="system-ui,sans-serif">APIs</text>
    <text x="200" y="388" text-anchor="middle" fill="rgba(255,255,255,0.38)" font-size="10" font-weight="500" letter-spacing="0.2em" font-family="system-ui,sans-serif">CONNECT · STREAM</text>
  </svg>`,
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
