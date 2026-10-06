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
    stack: ['Three.js', 'GSAP', 'ScrollTrigger', 'Vite'],
  },
  {
    id: 'fire-and-blood',
    title: 'Fire & Blood',
    kind: 'Live SPA',
    year: '2026',
    at: 2026.2,
    image: '/hod-thumbnail.png',
    url: 'https://house-of-dragons-hazel.vercel.app/',
    paint: '#ff2e2e',
    summary: 'House of the Dragon tribute with a 3D dragon hero and chaptered lore.',
    detail: 'A scroll-driven tribute to the dragons of the Dance: Vhagar, Sunfyre and Caraxes, each with their own chapter.',
    stack: ['Three.js', 'GSAP', 'WebGL'],
  },
  {
    id: 'constrack',
    title: 'Constrack',
    kind: 'Full-Stack App',
    year: '2025',
    at: 2025.4,
    image: '/constrack-web.png',
    gallery: ['/constrack-web.png', '/constrack-mobile.png'],
    paint: '#f6a800',
    summary: 'Cross-platform project management for construction tracking.',
    detail: 'React frontend with a NestJS API. Real-time updates, AI-assisted task generation, milestone tracking, manpower costing and Firebase on Google Cloud.',
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
  now?: boolean;
};

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
  },
  {
    at: 2025.4,
    tag: '2025 · Bonus stage',
    title: 'Magna Cum Laude',
    sub: "Dean's Lister · IT Excellence · Outstanding IT Graduate",
    note: 'Graduated with top honors in BS Information Technology.',
    stack: ['Graduated'],
    era: 'Level cleared with a full coin count.',
  },
  {
    at: 2025.45,
    tag: 'Jun 2025 · World 4',
    title: 'Software Engineer / Frontend Developer',
    sub: 'N-Compass TV',
    note: 'Angular and Svelte apps with Auth0 and WebSockets. Set UI standards and mentor interns.',
    stack: ['Angular', 'Svelte', 'TypeScript', 'Auth0'],
    era: 'Production frontends, every day.',
  },
  {
    at: 2026.2,
    tag: '2026 · Secret levels',
    title: 'Cinematic side projects',
    sub: 'Fenghuang · Fire & Blood',
    note: 'Scroll-driven storytelling sites with 3D models and GSAP.',
    stack: ['Three.js', 'GSAP', 'WebGL'],
    era: 'After hours: the cinematic web.',
  },
  {
    at: 2026.76,
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
