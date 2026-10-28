export type Project = {
  id: string;
  title: string;
  kind: string;
  year: string;
  /** Decimal year: position on the showcase timeline */
  at: number;
  image?: string;
  gallery?: string[];
  url?: string;
  /** Accent colour used for the poster fallback and hover tint */
  paint: string;
  summary: string;
  detail: string;
  /** Key features, shown as a list in the beacon's project view */
  features: string[];
  stack: string[];
};

export const projects: Project[] = [
  {
    id: 'fenghuang',
    title: 'Fenghuang',
    kind: 'Live SPA',
    year: '2026',
    at: 2026.5,
    image: '/phoenix-thumbnail.png',
    url: 'https://phoenix-web-phi.vercel.app/',
    paint: '#ffb800',
    summary: 'A myth in five colours. Scroll-driven storytelling site about the Chinese phoenix.',
    detail: 'Pairs a 3D Fenghuang model with calligraphic motifs and scroll-triggered chapters. Built as a cinematic single-page experience.',
    features: [
      '3D Fenghuang model as the hero, rendered with Three.js',
      'Scroll-triggered chapters driven by GSAP ScrollTrigger',
      'Calligraphic motifs woven through the layout',
      'The myth told across five colours',
    ],
    stack: ['Three.js', 'GSAP', 'ScrollTrigger', 'Vite'],
  },
  {
    id: 'class-record',
    title: 'Class Record',
    kind: 'Web App',
    year: '2026',
    at: 2026.7,
    url: 'https://class-record-five.vercel.app/',
    paint: '#10e09a',
    summary: 'A class record for teachers: rosters, attendance and grades in one place.',
    detail: 'Built for my own classes. Import a class list from a spreadsheet, take roll every meeting, record scores per student or per group, and let the app compute midterm and semestral grades. A voice assistant powered by Claude helps along the way.',
    features: [
      'Class records with subject, EDP code, schedule and units',
      'Import class lists from Excel or CSV',
      'Attendance roll per meeting, with configurable late rules',
      'Graded items by category, with midterm and semestral computation',
      'Drag-and-drop groups, scored by student or by group',
      'Dashboard with term progress, grade distribution and students who need attention',
      'Voice assistant powered by Claude',
    ],
    stack: ['SvelteKit', 'Supabase', 'Claude API', 'SheetJS', 'Web Speech API', 'TailwindCSS', 'Vercel'],
  },
  {
    id: 'fire-and-blood',
    title: 'Fire & Blood',
    kind: 'Live SPA',
    year: '2026',
    at: 2026.2,
    image: '/hod-thumbnail.png',
    url: 'https://house-of-dragons-deanbarquio.vercel.app/',
    paint: '#ff2e2e',
    summary: 'House of the Dragon tribute with a 3D dragon hero and chaptered lore.',
    detail: 'A scroll-driven tribute to the dragons of the Dance: Vhagar, Sunfyre and Caraxes, each with their own chapter.',
    features: [
      '3D dragon hero rendered in WebGL',
      'One chapter each for Vhagar, Sunfyre and Caraxes',
      'Scroll-driven storytelling with GSAP',
    ],
    stack: ['Three.js', 'GSAP', 'WebGL'],
  },
  {
    id: 'iron-spider',
    title: 'Iron Spider vs Hulk',
    kind: 'Live SPA',
    year: '2026',
    at: 2026.75,
    url: 'https://spiderman-hulk.vercel.app',
    paint: '#e8192c',
    summary: 'A 3D Iron Spider showcase that ends in a playable fight against the Hulk.',
    detail: 'Shows every animation clip in the Iron Spider model, then pits the suit against the Hulk. You can watch a scripted 50-second cinematic or take control and fight an AI Hulk in a 3D arena. Both models were optimised for the web, and the Hulk dropped from 111 MB to 12.8 MB.',
    features: [
      'Arsenal browser for 32 Iron Spider and 170+ Hulk animation clips, with Play all and slow-mo',
      'Playable arena: combos, web shots, dodges and an Instant Kill meter, on keyboard or touch',
      'AI Hulk that chases, leap-slams, throws gamma lightning and gets enraged so he cannot be stun-locked',
      'GSAP-choreographed cinematic with camera rigs, letterboxing, slow-mo and shockwaves',
      'Pooled FX for sparks, rings, webs and hit lights, plus screen shake',
      'GLB models compressed with gltf-transform and WebP textures',
    ],
    stack: ['Astro', 'Three.js', 'GSAP', 'TypeScript', 'glTF-Transform', 'Vercel'],
  },
  {
    id: 'vault-budget',
    title: 'Vault Budget',
    kind: 'PWA',
    year: '2026',
    at: 2026.8,
    url: 'https://vault-budget-two.vercel.app/',
    paint: '#8b5cf6',
    summary: 'Local-first budgeting, wallet and net-worth app with household sync.',
    detail: 'Runs fully offline on localStorage. Once you sign in, it syncs to Supabase and shares a workspace with your household in real time. Quick-add understands plain text and scanned receipts, and an AI assistant powered by Claude gives budget advice from summary numbers only, never raw transactions.',
    features: [
      'Local-first: works offline and pushes edits when you reconnect',
      'Household workspaces with admin, contributor and viewer roles enforced by RLS',
      'Realtime sync across members through Supabase Realtime',
      'Quick-add from natural language or receipt OCR with Tesseract.js',
      'Budgets, goals, subscriptions, debt payoff plans, forecasts and anomaly detection',
      'Donut, bar, line, Sankey and gauge charts in a bento layout',
      'AI budget assistant on Claude through a Supabase Edge Function',
      'Three.js background scene with GSAP kinetic type, installable as a PWA',
    ],
    stack: ['Svelte 5', 'Vite', 'Supabase', 'Claude API', 'Three.js', 'GSAP', 'Tesseract.js', 'TypeScript', 'PWA'],
  },
  {
    id: 'psits-finance',
    title: 'PSITS Finance',
    kind: 'Web App',
    year: '2026',
    at: 2026.85,
    url: 'https://psits-finance.vercel.app/',
    paint: '#2fd4ff',
    summary: 'Finance ledger for a student org: fees, payments, expenses and statements.',
    detail: 'Built for PSITS officers. It tracks fee collections per semester and payments per student, produces daily collection reports, and keeps a running cash book. Each semester ends in a printable financial statement. Every report exports to Excel, and Postgres row-level security keeps the data officer-only.',
    features: [
      'Dashboard calendar shading each day by amount collected, with cash-on-hand KPIs',
      'Fees per semester with paid, partial and unpaid rosters and end-of-collection summaries',
      'Daily and date-range collection reports',
      'Expenses by category, cash flow, cash book and other income',
      'Statement of receipts and disbursements, printable and exportable',
      'Semester carry-forward of ending balances',
      'Student roster import from .xlsx or .csv, and Excel export on every report',
      'Officer accounts managed in-app through secured database functions',
    ],
    stack: ['SvelteKit', 'Svelte 5', 'Supabase', 'PostgreSQL', 'ExcelJS', 'TypeScript', 'Vercel'],
  },
  {
    id: 'constrack',
    title: 'Constrack',
    kind: 'Full-Stack App',
    year: '2025',
    at: 2025.4,
    image: '/constrack-web.png',
    gallery: ['/constrack-web.png', '/constrack-mobile.png'],
    url: 'https://constrack-web-ui.vercel.app/',
    paint: '#f6a800',
    summary: 'Cross-platform project management for construction tracking.',
    detail: 'React frontend with a NestJS API. Real-time updates, AI-assisted task generation, milestone tracking, manpower costing and Firebase on Google Cloud.',
    features: [
      'Web and mobile clients on one NestJS API',
      'Real-time project updates',
      'AI-assisted task generation',
      'Milestone tracking and manpower costing',
      'Firebase on Google Cloud',
    ],
    stack: ['React', 'NestJS', 'Firebase', 'GCP', 'Prisma', 'TailwindCSS'],
  },
  {
    id: 'control-panel',
    title: 'Control Panel',
    kind: 'Internal Tool',
    year: '2025',
    at: 2025.2,
    image: '/control_panel.png',
    gallery: ['/control_panel.png', '/control_panel_2.png'],
    paint: '#29e3ff',
    summary: 'Internal control system for N-Compass features and operations.',
    detail: 'Solo-built during internship. Elasticsearch/OpenSearch for fast search, Next.js App Router, TanStack Query for server state, Docker deployment.',
    features: [
      'Solo-built during my internship',
      'Fast search with Elasticsearch / OpenSearch',
      'Next.js App Router with TanStack Query for server state',
      'Shipped in Docker containers',
    ],
    stack: ['Next.js', 'NestJS', 'Elasticsearch', 'Docker', 'TanStack Query'],
  },
  {
    id: 'component-pantry',
    title: 'Component Pantry',
    kind: 'UI Library',
    year: '2025',
    at: 2025.6,
    paint: '#5b3dff',
    summary: 'In-house Angular component library shared across teams.',
    detail: '50+ Angular components (charts, form controls, data tables, design tokens) published to an internal Verdaccio registry. Cut frontend dev time by roughly 40%.',
    features: [
      '50+ shared Angular components',
      'Charts, form controls, data tables and design tokens',
      'Published to an internal Verdaccio registry',
      'Cut frontend dev time by roughly 40%',
    ],
    stack: ['Angular', 'Verdaccio', 'TailwindCSS', 'ApexCharts'],
  },
  {
    id: 'psits',
    title: 'PSITS Portal',
    kind: 'Web Portal',
    year: '2024',
    at: 2024.2,
    image: '/psits_website.png',
    gallery: ['/psits_website.png', '/psits_website_2.png'],
    paint: '#2f6bff',
    summary: 'Membership workflow and merch shop for a student org.',
    detail: 'Handles admissions, receipt validation, generated membership cards and event registration with financial reporting.',
    features: [
      'Membership admissions with receipt validation',
      'Generated membership cards',
      'Event registration',
      'Merch shop with financial reporting',
    ],
    stack: ['React', 'Node.js', 'MongoDB', 'TailwindCSS'],
  },
  {
    id: 'hikemate',
    title: 'Hikemate',
    kind: 'Mobile App',
    year: '2024',
    at: 2024.6,
    image: '/hikemate_1.jpeg',
    gallery: ['/hikemate_1.jpeg', '/hikemate_2.jpeg', '/hikemate_3.jpeg', '/hikemate_4.jpeg'],
    paint: '#ff6a1a',
    summary: 'Hiking companion with topo trails and offline maps.',
    detail: 'Flutter with MapLibre, geolocated pace metrics, elevation profiles, route recording and trail search.',
    features: [
      'Topo trails and offline maps with MapLibre',
      'Geolocated pace metrics and elevation profiles',
      'Route recording',
      'Trail search',
    ],
    stack: ['Flutter', 'Kotlin', 'MapLibre', 'GPS'],
  },
  {
    id: 'buildit',
    title: 'BuildIT',
    kind: 'Mobile App',
    year: '2024',
    at: 2024.4,
    image: '/buildIt_mobile.png',
    gallery: ['/buildIt_mobile.png', '/buildIt_mobile_2.png', '/buildIt_mobile_3.png', '/buildIt_mobile_4.png'],
    paint: '#c6ff00',
    summary: 'Pairs construction workers with community service requests.',
    detail: 'Custom bookings, worker workspace and feedback loop to close employment gaps for independent laborers.',
    features: [
      'Matches construction workers with community service requests',
      'Custom bookings',
      'Workspace for workers to manage their jobs',
      'Feedback loop between clients and workers',
    ],
    stack: ['Flutter', 'Node.js', 'PostgreSQL', 'Socket.io'],
  },
  {
    id: 'meeting-room',
    title: 'Room Booker',
    kind: 'Scheduler',
    year: '2024',
    at: 2024.8,
    image: '/meeting_room1.png',
    gallery: ['/meeting_room1.png', '/meeting_room2.png', '/meeting_room3.png', '/meeting_room4.png'],
    paint: '#29e3ff',
    summary: 'Corporate meeting-room scheduler that kills double bookings.',
    detail: 'Business-rules engine, interactive calendars, authorization tiers, automated invites and room utilization analytics.',
    features: [
      'Business-rules engine that blocks double bookings',
      'Interactive calendars',
      'Authorization tiers',
      'Automated invites',
      'Room utilization analytics',
    ],
    stack: ['React', 'Express', 'SQLite', 'TailwindCSS'],
  },
  {
    id: 'ntv-dashboard',
    title: 'NTV Dashboard',
    kind: 'HR System',
    year: '2025',
    at: 2025.8,
    paint: '#10e09a',
    summary: 'HR tracking for inventory and manpower with live updates.',
    detail: 'NestJS backend, Next.js frontend and Prisma ORM. Employee records, inventory movements and automated reports.',
    features: [
      'Employee records',
      'Inventory movement tracking',
      'Live updates',
      'Automated reports',
    ],
    stack: ['NestJS', 'Next.js', 'Prisma', 'MySQL'],
  },
];

export type Role = {
  period: string;
  role: string;
  company: string;
  note: string;
  stack: string[];
  current?: boolean;
};

export const roles: Role[] = [
  {
    period: '2026 — NOW',
    role: 'Instructor',
    company: 'University of Cebu Banilad',
    note: 'Teaches Android development with Kotlin and Software Testing & Quality Assurance.',
    stack: ['Android', 'Kotlin', 'Software Testing', 'QA'],
    current: true,
  },
  {
    period: '2025 — NOW',
    role: 'Software Engineer / Frontend Developer',
    company: 'N-Compass TV',
    note: 'Angular and Svelte apps with Auth0, WebSockets and Filestack. Set UI standards for the team and mentor interns.',
    stack: ['Angular', 'Svelte', 'TypeScript', 'TailwindCSS', 'Auth0'],
    current: true,
  },
  {
    period: 'MAR — MAY 2025',
    role: 'Full-Stack Developer Intern',
    company: 'N-Compass TV',
    note: 'Built the internal Control Panel and Company Dashboard solo. Elasticsearch, Next.js SSR, TanStack Query, Docker.',
    stack: ['Next.js', 'NestJS', 'Elasticsearch', 'Docker'],
  },
  {
    period: 'JAN — MAR 2025',
    role: 'Quality Assurance Intern',
    company: 'N-Compass TV',
    note: 'Manual testing and UAT. Automated cross-browser suites with Selenium WebDriver.',
    stack: ['Selenium', 'UAT', 'Bug Reporting'],
  },
];

export type Milestone = {
  /** Decimal year, used to place ruler ticks between cards */
  at: number;
  tag: string;
  title: string;
  sub: string;
  note: string;
  stack: string[];
  era: string;
  /** Optional still for the journey card; cards without one show the era line */
  image?: string;
  /** Optional tint for the focused card, matched to the image */
  paint?: string;
  /** Project id when this milestone is a project, so the card opens that project's page */
  project?: string;
  /** Extra stills for the milestone's /journey page */
  gallery?: string[];
  /** Project ids from this chapter, linked from its /journey page */
  related?: string[];
  now?: boolean;
};

export const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A project milestone opens its beacon in the valley (/#id); every other milestone gets its own /journey page */
export const milestoneHref = (m: Milestone) => (m.project ? `/#${m.project}` : `/journey/${slug(m.title)}`);

/** Career chain, oldest → newest; the last card is "now" */
export const milestones: Milestone[] = [
  {
    at: 2021.6,
    tag: '2021 · Level start',
    title: 'BS Information Technology',
    sub: 'Cebu City University',
    note: 'Four years of fundamentals. PSITS treasurer and finance volunteer along the way.',
    stack: ['Fundamentals', 'PSITS', 'Leadership'],
    era: 'Press start. Learning the controls, one lab at a time.',
  },
  {
    at: 2024.3,
    tag: '2024 · Side quests',
    title: 'First real builds',
    sub: 'PSITS Portal · BuildIT · Hikemate',
    note: 'Shipped a student-org portal, a worker-booking app and a hiking companion.',
    stack: ['React', 'Flutter', 'Node.js'],
    era: 'Building levels of my own, for real users.',
    image: '/psits_website.png',
    related: ['psits', 'buildit', 'hikemate', 'meeting-room'],
  },
  {
    at: 2025.05,
    tag: 'Jan 2025 · World 2',
    title: 'Quality Assurance Intern',
    sub: 'N-Compass TV',
    note: 'Manual testing and UAT. Automated cross-browser suites with Selenium WebDriver.',
    stack: ['Selenium', 'UAT'],
    era: 'Learning to break things on purpose.',
  },
  {
    at: 2025.2,
    tag: 'Mar 2025 · World 3',
    title: 'Full-Stack Developer Intern',
    sub: 'N-Compass TV',
    note: 'Built the internal Control Panel and Company Dashboard solo.',
    stack: ['Next.js', 'NestJS', 'Elasticsearch', 'Docker'],
    era: 'Solo runs. Search, SSR and containers.',
    image: '/control_panel.png',
    related: ['control-panel', 'ntv-dashboard'],
  },
  {
    at: 2025.4,
    tag: '2025 · Bonus stage',
    title: 'Magna Cum Laude',
    sub: "Dean's Lister · IT Excellence · Outstanding IT Graduate",
    note: 'Graduated with top honors in BS Information Technology.',
    stack: ['Graduated'],
    era: 'Level cleared with a full coin count.',
    image: '/me/grad-1.webp',
    gallery: ['/me/grad-2.webp'],
  },
  {
    at: 2025.45,
    tag: 'Jun 2025 · World 4',
    title: 'Software Engineer / Frontend Developer',
    sub: 'N-Compass TV',
    note: 'Angular and Svelte apps with Auth0 and WebSockets. Set UI standards and mentor interns.',
    stack: ['Angular', 'Svelte', 'TypeScript', 'Auth0'],
    era: 'Production frontends, every day.',
    related: ['component-pantry'],
  },
  {
    at: 2026.2,
    tag: '2026 · Secret levels',
    title: 'Cinematic side projects',
    sub: 'Fenghuang · Fire & Blood',
    note: 'Scroll-driven storytelling sites with 3D models and GSAP.',
    stack: ['Three.js', 'GSAP', 'WebGL'],
    era: 'After hours: the cinematic web.',
    image: '/phoenix-thumbnail.png',
    gallery: ['/hod-thumbnail.png'],
    related: ['fenghuang', 'fire-and-blood'],
  },
  {
    at: 2026.6,
    tag: '2026 · Co-op mode',
    title: 'Instructor',
    sub: 'University of Cebu Banilad',
    note: 'Teaching Android Kotlin and Software Testing & Quality Assurance.',
    stack: ['Android', 'Kotlin', 'QA'],
    era: 'Passing the controller to the next players.',
    related: ['class-record'],
  },
  {
    at: 2026.7,
    tag: '2026 · Power-up',
    title: 'Class Record',
    sub: 'Rosters, attendance and grades for my classes',
    note: 'Import class lists, take roll, and compute midterm and semestral grades, with a Claude voice assistant.',
    stack: ['SvelteKit', 'Supabase', 'Claude API'],
    era: 'Built the tool my own classes needed.',
    image: '/class-record-thumbnail.png',
    paint: '#3d5af1',
    project: 'class-record',
  },
  {
    at: 2026.75,
    tag: '2026 · Boss fight',
    title: 'Iron Spider vs Hulk',
    sub: 'Playable 3D arena · scripted cinematic',
    note: 'An animation showcase that ends in a fight against an AI Hulk, models squeezed from 111 MB to 12.8 MB.',
    stack: ['Three.js', 'GSAP', 'Astro'],
    era: 'Then the side project fought back.',
    image: '/iron-spider-thumbnail.png',
    paint: '#d6162f',
    project: 'iron-spider',
  },
  {
    at: 2026.8,
    tag: '2026 · Save point',
    title: 'Vault Budget',
    sub: 'Local-first budgeting PWA with household sync',
    note: 'Works offline, syncs in real time, reads receipts, and asks Claude for advice on summaries only.',
    stack: ['Svelte 5', 'Supabase', 'PWA'],
    era: 'Every coin counted, even offline.',
    image: '/vault-budget-thumbnail.png',
    paint: '#d4a85a',
    project: 'vault-budget',
  },
  {
    at: 2026.85,
    tag: '2026 · Full circle',
    title: 'PSITS Finance',
    sub: 'Ledger for the org I once kept the books for',
    note: 'Fees, payments, expenses and printable semester statements, locked to officers with row-level security.',
    stack: ['SvelteKit', 'PostgreSQL', 'ExcelJS'],
    era: 'Back to PSITS, this time with code.',
    image: '/psits-finance-thumbnail.png',
    paint: '#f5b800',
    project: 'psits-finance',
  },
  {
    at: 2026.9,
    tag: 'Now',
    title: 'Next level loading',
    sub: 'Open to roles & collabs',
    note: 'Looking for teams that care about craft, motion and the details.',
    stack: ['Available'],
    era: 'Your move, player two.',
    now: true,
  },
];

export const skillGroups = [
  { label: 'Frontend', items: ['Angular', 'React', 'Next.js', 'Svelte', 'TypeScript', 'TailwindCSS'] },
  { label: 'Motion & 3D', items: ['GSAP', 'ScrollTrigger', 'Three.js', 'WebGL', 'Lenis'] },
  { label: 'Backend', items: ['Node.js', 'NestJS', 'REST', 'WebSockets', 'Auth0'] },
  { label: 'Data', items: ['MySQL', 'MongoDB', 'Prisma', 'Firebase', 'Elasticsearch'] },
  { label: 'Ship', items: ['Docker', 'GCP', 'Terraform', 'CI/CD', 'Flutter'] },
];

export const education = {
  school: 'Cebu City University',
  degree: 'BS Information Technology',
  period: '2021 — 2025',
  honors: ['Magna Cum Laude', "Dean's Lister", 'IT Excellence', 'Outstanding IT Graduate'],
  org: 'PSITS Treasurer · Finance Volunteer',
};
