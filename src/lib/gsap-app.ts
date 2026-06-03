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

  ScrollTrigger.batch('.mfy-station', {
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
    gsap.set(['.mfy-station', '.np-track-row', '.mono-card', '.reveal'], { opacity: 1, x: 0, y: 0, scale: 1 });
    document.querySelectorAll<HTMLElement>('.js-track-plays').forEach((el) => {
      const n = Number(el.dataset.plays || 0);
      if (n) el.textContent = n.toLocaleString('en-US');
    });
    return () => {};
  }

  const ctx = gsap.context(() => {
    initLayoutEntrance();
    initRevealElements();
    initMadeForYou();
    initTrackOfWeek();
    initSkillCards();
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
