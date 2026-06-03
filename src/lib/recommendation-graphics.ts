/** Abstract poster art per recommender — Spotify cover style */

export const recommendationPosters: Record<string, string> = {
  hazel: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="rec-hz-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#831843"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#fbcfe8"/>
      </linearGradient>
      <linearGradient id="rec-hz-b" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#500724"/><stop offset="100%" stop-color="#f472b6"/>
      </linearGradient>
    </defs>
    <circle cx="120" cy="100" r="90" fill="url(#rec-hz-a)" opacity="0.5"/>
    <circle cx="300" cy="280" r="110" fill="url(#rec-hz-b)" opacity="0.45"/>
    <path d="M40 320 Q200 180 360 320" stroke="url(#rec-hz-a)" stroke-width="3" fill="none" opacity="0.6"/>
    <rect x="60" y="60" width="48" height="48" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <rect x="108" y="108" width="64" height="64" rx="10" fill="rgba(236,72,153,0.25)"/>
    <text x="200" y="210" text-anchor="middle" fill="rgba(255,255,255,0.15)" font-size="120" font-weight="900" font-family="system-ui">UX</text>
  </svg>`,

  shawn: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="rec-sh-a" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#60a5fa"/>
      </linearGradient>
    </defs>
    <g opacity="0.85">
      <rect x="80" y="100" width="240" height="28" rx="4" fill="url(#rec-sh-a)" opacity="0.7"/>
      <rect x="100" y="150" width="200" height="28" rx="4" fill="url(#rec-sh-a)" opacity="0.55"/>
      <rect x="120" y="200" width="160" height="28" rx="4" fill="url(#rec-sh-a)" opacity="0.4"/>
      <rect x="140" y="250" width="120" height="28" rx="4" fill="url(#rec-sh-a)" opacity="0.3"/>
    </g>
    <circle cx="200" cy="200" r="70" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.5"/>
    <path d="M200 130 L230 200 L200 270 L170 200 Z" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" stroke-width="1.5"/>
    <text x="48" y="360" fill="#fff" font-size="22" font-weight="800" font-family="system-ui">QA</text>
  </svg>`,

  samantha: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="rec-sa-a" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#4c1d95"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#c4b5fd"/>
      </linearGradient>
    </defs>
    <polygon points="200,40 340,160 280,340 120,340 60,160" fill="url(#rec-sa-a)" opacity="0.35"/>
    <g stroke="#8b5cf6" stroke-width="1.5" fill="none" opacity="0.5">
      <line x1="200" y1="120" x2="200" y2="280"/><line x1="120" y1="200" x2="280" y2="200"/>
      <line x1="145" y1="145" x2="255" y2="255"/><line x1="255" y1="145" x2="145" y2="255"/>
    </g>
    <circle cx="200" cy="200" r="48" fill="rgba(139,92,246,0.3)"/>
    <text x="200" y="208" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" letter-spacing="0.2em" font-family="system-ui">LEAD</text>
  </svg>`,

  joshua: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="rec-jj-a" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#042f2e"/><stop offset="50%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#a5f3fc"/>
      </linearGradient>
    </defs>
    <path d="M0 200 L400 200" stroke="rgba(6,182,212,0.2)" stroke-width="1"/>
    <path d="M200 0 L200 400" stroke="rgba(6,182,212,0.2)" stroke-width="1"/>
    <g fill="url(#rec-jj-a)" opacity="0.7">
      <rect x="100" y="80" width="200" height="12" rx="2"/>
      <rect x="120" y="110" width="160" height="12" rx="2" opacity="0.8"/>
      <rect x="140" y="140" width="120" height="12" rx="2" opacity="0.6"/>
    </g>
    <circle cx="200" cy="260" r="55" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="8 6"/>
    <text x="200" y="268" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-weight="700" font-family="system-ui">MENTOR</text>
  </svg>`,

  jeanne: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="400" fill="#0a0a0a"/>
    <defs>
      <linearGradient id="rec-jp-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c2d12"/><stop offset="45%" stop-color="#f97316"/><stop offset="100%" stop-color="#fdba74"/>
      </linearGradient>
    </defs>
    <g opacity="0.9">
      <rect x="60" y="200" width="280" height="36" rx="6" fill="url(#rec-jp-a)" opacity="0.5"/>
      <rect x="80" y="250" width="240" height="36" rx="6" fill="url(#rec-jp-a)" opacity="0.7"/>
      <rect x="100" y="300" width="200" height="36" rx="6" fill="url(#rec-jp-a)" opacity="0.9"/>
    </g>
    <path d="M200 60 L260 140 L200 220 L140 140 Z" fill="rgba(249,115,22,0.25)" stroke="#fb923c" stroke-width="1.5"/>
    <text x="200" y="130" text-anchor="middle" fill="#fff" font-size="18" font-weight="800" font-family="system-ui">FULL</text>
    <text x="200" y="155" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-weight="600" font-family="system-ui">STACK</text>
  </svg>`,
};
