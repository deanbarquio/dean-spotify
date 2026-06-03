import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SCROLLER = '#main-scroll';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollTriggerDefaults() {
  return {
    scroller: SCROLLER,
  };
}

function initLayoutEntrance() {
  gsap.from('#sidebar', { x: -24, opacity: 0, duration: 0.7, ease: 'power2.out', delay: 0.1 });
  gsap.from('#player-bar', { y: 20, opacity: 0, duration: 0.7, ease: 'power2.out', delay: 0.4 });
  const banner = document.getElementById('dash-banner');
  if (banner) {
    gsap.from(banner, { opacity: 0, y: 20, duration: 0.9, ease: 'power2.out', delay: 0.2 });
  }
}

function initRevealElements() {
  document.querySelectorAll('.reveal').forEach((el) => {
    const delay = parseFloat((el as HTMLElement).dataset.delay || '0') / 1000;
    gsap.fromTo(
      el,
      { y: 28, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.65,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          ...scrollTriggerDefaults(),
          trigger: el,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
}

function initMadeForYou() {
  const section = document.querySelector('.mfy-section');
  if (!section) return;

  gsap.from('.mfy-section-title, .mfy-show-all', {
    y: 12,
    opacity: 0,
    duration: 0.5,
    stagger: 0.06,
    ease: 'power2.out',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: section,
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });

  ScrollTrigger.batch('.js-mfy-card', {
    ...scrollTriggerDefaults(),
    start: 'top 92%',
    interval: 0.08,
    batchMax: 6,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 20, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.07,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });

}

function initTrackOfWeek() {
  const panel = document.getElementById('track-of-week');
  if (!panel) return;

  gsap.from('.np-tracks-header > *', {
    y: 10,
    opacity: 0,
    duration: 0.45,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: panel,
      start: 'top 90%',
      toggleActions: 'play none none none',
    },
  });

  ScrollTrigger.batch('.np-track-row', {
    ...scrollTriggerDefaults(),
    trigger: panel,
    start: 'top 88%',
    interval: 0.06,
    batchMax: 4,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.09,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });

  document.querySelectorAll<HTMLElement>('.np-track-row').forEach((row) => {
    const num = row.querySelector('.np-track-num');
    const play = row.querySelector('.np-track-play-hover');
    const thumb = row.querySelector('.np-track-thumb');

    row.addEventListener('mouseenter', () => {
      gsap.to(row, { backgroundColor: 'rgba(255,255,255,0.1)', duration: 0.2, ease: 'power2.out' });
      if (num) gsap.to(num, { opacity: 0, scale: 0.6, duration: 0.15, ease: 'power2.out' });
      if (play) gsap.to(play, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' });
      if (thumb) gsap.to(thumb, { scale: 1.04, duration: 0.25, ease: 'power2.out' });
    });

    row.addEventListener('mouseleave', () => {
      gsap.to(row, { backgroundColor: 'rgba(255,255,255,0)', duration: 0.2, ease: 'power2.out' });
      if (num) gsap.to(num, { opacity: 1, scale: 1, duration: 0.15, ease: 'power2.out' });
      if (play) gsap.to(play, { opacity: 0, scale: 0.7, duration: 0.15, ease: 'power2.in' });
      if (thumb) gsap.to(thumb, { scale: 1, duration: 0.25, ease: 'power2.out' });
    });
  });

  ScrollTrigger.batch('.js-track-plays', {
    ...scrollTriggerDefaults(),
    trigger: panel,
    start: 'top 85%',
    once: true,
    onEnter: (elements) => {
      elements.forEach((el) => {
        const node = el as HTMLElement;
        const target = Number(node.dataset.plays || 0);
        if (!target) return;
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: () => {
            node.textContent = Math.round(counter.val).toLocaleString('en-US');
          },
        });
      });
    },
  });
}

function initAlbumMixCards() {
  const showcase = document.querySelector('.album-showcase');
  if (!showcase) return;

  document.querySelectorAll<HTMLElement>('.album-row-title, .album-row-link').forEach((el) => {
    gsap.from(el, {
      y: 10,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.out',
      scrollTrigger: {
        ...scrollTriggerDefaults(),
        trigger: el.closest('.album-row') || showcase,
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
    });
  });

  ScrollTrigger.batch('.js-album-mix', {
    ...scrollTriggerDefaults(),
    trigger: showcase,
    start: 'top 90%',
    interval: 0.08,
    batchMax: 4,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 28, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });
}

function initExperienceSection() {
  const section = document.getElementById('experience');
  if (!section) return;

  gsap.from('.exp-show-tile', {
    scale: 0.94,
    opacity: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: '.exp-show-collage',
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.exp-show-copy > *', {
    y: 20,
    opacity: 0,
    duration: 0.65,
    stagger: 0.06,
    ease: 'power2.out',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: section,
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });

  ScrollTrigger.batch('.js-exp-episode', {
    ...scrollTriggerDefaults(),
    trigger: section,
    start: 'top 85%',
    interval: 0.12,
    batchMax: 3,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.1,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });

  section.querySelectorAll<HTMLElement>('.js-exp-progress').forEach((bar) => {
    const pct = Number(bar.dataset.progress || 0);
    ScrollTrigger.create({
      ...scrollTriggerDefaults(),
      trigger: bar,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.to(bar, { width: `${pct}%`, duration: 1.1, ease: 'power2.out' });
      },
    });
  });

  document.querySelectorAll<HTMLElement>('.js-exp-episode').forEach((row) => {
    const art = row.querySelector('.exp-episode-art');

    row.addEventListener('mouseenter', () => {
      if (art) gsap.to(art, { scale: 1.04, duration: 0.3, ease: 'power2.out' });
    });

    row.addEventListener('mouseleave', () => {
      if (art) gsap.to(art, { scale: 1, duration: 0.25, ease: 'power2.out' });
    });
  });

  const showPlay = section.querySelector('.exp-btn-play');
  if (showPlay) {
    gsap.to(showPlay, {
      scale: 1.04,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }
}

function initSkillsSection() {
  const section = document.getElementById('skills');
  if (!section) return;

  gsap.from('.sk-hero-visual, .sk-hero-copy > *', {
    y: 24,
    opacity: 0,
    duration: 0.7,
    stagger: 0.07,
    ease: 'power3.out',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: section,
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.sk-hero-tile', {
    scale: 0.85,
    opacity: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: 'back.out(1.4)',
    scrollTrigger: {
      ...scrollTriggerDefaults(),
      trigger: '.sk-hero-collage',
      start: 'top 90%',
      toggleActions: 'play none none none',
    },
  });

  const heroPlay = section.querySelector('.js-sk-hero-play');
  if (heroPlay) {
    gsap.to(heroPlay, {
      scale: 1.05,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  document.querySelectorAll<HTMLElement>('.sk-block-header').forEach((header) => {
    gsap.from(header.children, {
      y: 10,
      opacity: 0,
      duration: 0.45,
      stagger: 0.05,
      ease: 'power2.out',
      scrollTrigger: {
        ...scrollTriggerDefaults(),
        trigger: header,
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
    });
  });

  section.querySelectorAll<HTMLElement>('.js-poster-spin').forEach((spin) => {
    gsap.to(spin, {
      rotation: 360,
      duration: 28,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%',
    });
  });

  ScrollTrigger.batch('.sk-playlist-card', {
    ...scrollTriggerDefaults(),
    trigger: section,
    start: 'top 82%',
    interval: 0.12,
    batchMax: 5,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 24, opacity: 0, rotateX: 8 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.55,
          stagger: 0.09,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });

  document.querySelectorAll<HTMLElement>('.sk-playlist-card-link').forEach((link) => {
    const play = link.querySelector('.sk-playlist-play');
    const shapes = link.querySelector('.js-poster-shapes');

    link.addEventListener('mouseenter', () => {
      if (play) gsap.to(play, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.7)' });
      if (shapes) {
        gsap.to(shapes, {
          rotation: 10,
          duration: 0.45,
          ease: 'power2.out',
          transformOrigin: '50% 50%',
          svgOrigin: '200 200',
        });
      }
    });

    link.addEventListener('mouseleave', () => {
      if (play) gsap.to(play, { opacity: 0, y: 8, scale: 0.9, duration: 0.2, ease: 'power2.in' });
      if (shapes) {
        gsap.to(shapes, {
          rotation: 0,
          duration: 0.4,
          ease: 'power2.out',
          transformOrigin: '50% 50%',
          svgOrigin: '200 200',
        });
      }
    });
  });

  ScrollTrigger.batch('.sk-track-row', {
    ...scrollTriggerDefaults(),
    trigger: section.querySelector('.sk-tracks-block') || section,
    start: 'top 88%',
    interval: 0.06,
    batchMax: 4,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          overwrite: true,
        }
      );
    },
  });

  document.querySelectorAll<HTMLElement>('.js-sk-pop-bars').forEach((wrap) => {
    const bars = wrap.querySelectorAll('.sk-pop-bar--on');
    ScrollTrigger.create({
      ...scrollTriggerDefaults(),
      trigger: wrap,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.fromTo(
          bars,
          { scaleY: 0.15 },
          {
            scaleY: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'back.out(2)',
            transformOrigin: 'bottom',
          }
        );
      },
    });
  });

  document.querySelectorAll<HTMLElement>('.sk-track-row').forEach((row) => {
    const num = row.querySelector('.sk-track-num');
    const play = row.querySelector('.sk-track-play-hover');
    const thumb = row.querySelector('.sk-track-thumb');
    const icon = row.querySelector('.sk-track-icon');

    row.addEventListener('mouseenter', () => {
      gsap.to(row, { backgroundColor: 'rgba(255,255,255,0.1)', duration: 0.2, ease: 'power2.out' });
      if (num) gsap.to(num, { opacity: 0, scale: 0.6, duration: 0.15, ease: 'power2.out' });
      if (play) gsap.to(play, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' });
      if (thumb) gsap.to(thumb, { scale: 1.06, duration: 0.25, ease: 'power2.out' });
      if (icon) gsap.to(icon, { rotation: 12, scale: 1.15, duration: 0.3, ease: 'back.out(1.5)' });
    });

    row.addEventListener('mouseleave', () => {
      gsap.to(row, { backgroundColor: 'rgba(255,255,255,0)', duration: 0.2, ease: 'power2.out' });
      if (num) gsap.to(num, { opacity: 1, scale: 1, duration: 0.15, ease: 'power2.out' });
      if (play) gsap.to(play, { opacity: 0, scale: 0.7, duration: 0.15, ease: 'power2.in' });
      if (thumb) gsap.to(thumb, { scale: 1, duration: 0.25, ease: 'power2.out' });
      if (icon) gsap.to(icon, { rotation: 0, scale: 1, duration: 0.25, ease: 'power2.out' });
    });
  });
}

function initDashQuickLinks() {
  const cards = document.querySelectorAll('.dash-quick-card');
  if (!cards.length) return;

  gsap.from(cards, {
    y: 14,
    opacity: 0,
    duration: 0.5,
    stagger: 0.05,
    ease: 'power2.out',
    delay: 0.35,
  });
}

function initSkillCards() {
  const split = document.querySelector('.dash-split');
  if (!split) return;

  ScrollTrigger.batch('.mono-card', {
    ...scrollTriggerDefaults(),
    trigger: split,
    start: 'top 88%',
    interval: 0.1,
    batchMax: 3,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    },
  });
}

/** Boot all scroll-driven and entrance animations for the portfolio shell. */
export function initGsapApp(): () => void {
  if (prefersReducedMotion()) {
    gsap.set(['.dash-quick-card', '.js-mfy-card', '.np-track-row', '.mono-card', '.reveal', '.js-album-mix', '.sk-playlist-card', '.sk-track-row', '.sk-pop-bar--on', '.js-exp-episode'], {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
    });
    document.querySelectorAll<HTMLElement>('.js-track-plays').forEach((el) => {
      const n = Number(el.dataset.plays || 0);
      if (n) el.textContent = n.toLocaleString('en-US');
    });
    return () => {};
  }

  const ctx = gsap.context(() => {
    initLayoutEntrance();
    initDashQuickLinks();
    initRevealElements();
    initMadeForYou();
    initTrackOfWeek();
    initSkillCards();
    initExperienceSection();
    initSkillsSection();
    initAlbumMixCards();
  });

  let resizeTimer: ReturnType<typeof setTimeout>;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    ctx.revert();
  };
}
