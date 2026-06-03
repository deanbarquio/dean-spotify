import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const WRAPPER_ID = 'main-scroll';
const CONTENT_ID = 'main-scroll-content';

/** Nested regions that keep native overflow scrolling. */
const NATIVE_SCROLL_SELECTOR =
  '.lyrics-container, .mfy-scroll, .sb-library, [data-native-scroll]';

let lenis: Lenis | null = null;
let tickerHook: ((time: number) => void) | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isSmoothScrollActive(): boolean {
  return lenis !== null;
}

export function getMainScroller(): HTMLElement | null {
  return document.getElementById(WRAPPER_ID);
}

export function getMainScrollContent(): HTMLElement | null {
  return document.getElementById(CONTENT_ID);
}

export function getMainScrollMetrics() {
  if (lenis) {
    const maxScroll = lenis.limit;
    const scrollTop = lenis.scroll;
    return {
      scrollTop,
      maxScroll,
      progress: maxScroll > 0 ? scrollTop / maxScroll : 0,
    };
  }

  const scroller = getMainScroller();
  if (!scroller) {
    return { scrollTop: 0, maxScroll: 0, progress: 0 };
  }

  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const scrollTop = scroller.scrollTop;
  return {
    scrollTop,
    maxScroll,
    progress: maxScroll > 0 ? scrollTop / maxScroll : 0,
  };
}

export function scrollMainTo(
  top: number,
  options: { immediate?: boolean; duration?: number } = {}
): void {
  const y = Math.max(0, top);

  if (lenis) {
    lenis.scrollTo(y, {
      immediate: options.immediate,
      duration: options.duration ?? 1.1,
      programmatic: true,
    });
    return;
  }

  getMainScroller()?.scrollTo({
    top: y,
    behavior: options.immediate ? 'auto' : 'smooth',
  });
}

export function scrollMainBy(
  delta: number,
  options: { duration?: number } = {}
): void {
  const { scrollTop, maxScroll } = getMainScrollMetrics();
  scrollMainTo(Math.min(maxScroll, Math.max(0, scrollTop + delta)), options);
}

export function onMainScroll(callback: () => void): () => void {
  if (lenis) {
    return lenis.on('scroll', callback);
  }

  const scroller = getMainScroller();
  if (!scroller) return () => {};

  scroller.addEventListener('scroll', callback, { passive: true });
  return () => scroller.removeEventListener('scroll', callback);
}

/**
 * Lenis smooth scroll for #main-scroll + GSAP ScrollTrigger sync.
 * Call once before initGsapApp().
 */
export function initSmoothScroll(): () => void {
  const wrapper = getMainScroller();
  const content = getMainScrollContent();

  if (!wrapper || !content) return () => {};

  if (prefersReducedMotion()) {
    wrapper.style.overflowY = 'auto';
    return () => {};
  }

  wrapper.style.overflow = 'hidden';

  lenis = new Lenis({
    wrapper,
    content,
    lerp: 0.09,
    duration: 1.15,
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.15,
    autoResize: true,
    prevent: (node) => !!node.closest(NATIVE_SCROLL_SELECTOR),
  });

  lenis.on('scroll', ScrollTrigger.update);

  ScrollTrigger.scrollerProxy(wrapper, {
    scrollTop(value) {
      if (arguments.length && value !== undefined && lenis) {
        lenis.scrollTo(value, { immediate: true, programmatic: true });
      }
      return lenis?.scroll ?? wrapper.scrollTop;
    },
    getBoundingClientRect() {
      return wrapper.getBoundingClientRect();
    },
    pinType: 'transform',
  });

  const onRefresh = () => lenis?.resize();
  ScrollTrigger.addEventListener('refresh', onRefresh);

  tickerHook = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerHook);
  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => {
    lenis?.resize();
    ScrollTrigger.refresh();
  });

  return () => {
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    if (tickerHook) gsap.ticker.remove(tickerHook);
    tickerHook = null;
    lenis?.destroy();
    lenis = null;
    wrapper.style.overflowY = 'auto';
  };
}
