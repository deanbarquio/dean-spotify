import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const WRAPPER_ID = 'main-scroll';
const CONTENT_ID = 'main-scroll-content';
const MOBILE_BP = 860;

/** Nested regions keep native overflow (horizontal lists, lyrics, sidebar library). */
const NATIVE_SCROLL_SELECTOR =
  '#album-detail-view, .lyrics-container, .mfy-scroll, .mix-row-scroll, .sb-library, .dash-filters, [data-native-scroll]';

let lenis: Lenis | null = null;
let tickerHook: ((time: number) => void) | null = null;
let scrollTriggerHook: (() => void) | null = null;
let modeMq: MediaQueryList | null = null;
let onModeMq: (() => void) | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Lenis fights touch scrolling; native overflow is more reliable on mobile/coarse pointers. */
export function shouldUseLenis(): boolean {
  if (prefersReducedMotion()) return false;
  if (window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  return true;
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
      duration: options.duration ?? 0.85,
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

function setupScrollerProxy(wrapper: HTMLElement, useLenis: boolean): void {
  ScrollTrigger.scrollerProxy(wrapper, {
    scrollTop(value) {
      if (arguments.length && value !== undefined) {
        if (lenis && useLenis) {
          lenis.scrollTo(value, { immediate: true, programmatic: true });
        } else {
          wrapper.scrollTop = value;
        }
      }
      return lenis && useLenis ? lenis.scroll : wrapper.scrollTop;
    },
    getBoundingClientRect() {
      return wrapper.getBoundingClientRect();
    },
    pinType: useLenis ? 'transform' : 'fixed',
  });
}

function clearScrollerProxy(wrapper: HTMLElement): void {
  ScrollTrigger.scrollerProxy(wrapper, {});
}

function applyNativeScrollerStyles(wrapper: HTMLElement, content: HTMLElement): void {
  wrapper.style.overflowY = 'auto';
  wrapper.style.overflowX = 'hidden';
  wrapper.style.webkitOverflowScrolling = 'touch';
  wrapper.style.overscrollBehavior = 'contain';
  content.classList.remove('lenis-scroll-content');
  content.style.willChange = '';
}

function initNativeScroll(wrapper: HTMLElement, content: HTMLElement): () => void {
  applyNativeScrollerStyles(wrapper, content);
  setupScrollerProxy(wrapper, false);

  const onScroll = () => ScrollTrigger.update();
  wrapper.addEventListener('scroll', onScroll, { passive: true });
  scrollTriggerHook = onScroll;

  requestAnimationFrame(() => ScrollTrigger.refresh());

  return () => {
    wrapper.removeEventListener('scroll', onScroll);
    scrollTriggerHook = null;
    clearScrollerProxy(wrapper);
  };
}

function initLenisScroll(wrapper: HTMLElement, content: HTMLElement): () => void {
  wrapper.style.overflow = 'hidden';
  wrapper.style.webkitOverflowScrolling = '';
  content.classList.add('lenis-scroll-content');

  lenis = new Lenis({
    wrapper,
    content,
    lerp: 0.16,
    duration: 0.85,
    smoothWheel: true,
    wheelMultiplier: 1.15,
    touchMultiplier: 1,
    autoResize: true,
    prevent: (node) => !!node.closest(NATIVE_SCROLL_SELECTOR),
  });

  setupScrollerProxy(wrapper, true);

  let scrollRaf = 0;
  const onLenisScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      ScrollTrigger.update();
    });
  };
  lenis.on('scroll', onLenisScroll);
  scrollTriggerHook = onLenisScroll;

  const onRefresh = () => lenis?.resize();
  ScrollTrigger.addEventListener('refresh', onRefresh);

  tickerHook = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerHook);

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
    content.classList.remove('lenis-scroll-content');
    clearScrollerProxy(wrapper);
    applyNativeScrollerStyles(wrapper, content);
  };
}

/**
 * Main column scroll: native on touch/mobile, Lenis on desktop pointer.
 * GSAP ScrollTrigger uses #main-scroll in both modes.
 */
export function initSmoothScroll(): () => void {
  const wrapper = getMainScroller();
  const content = getMainScrollContent();

  if (!wrapper || !content) return () => {};

  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });

  let teardownScroll = shouldUseLenis()
    ? initLenisScroll(wrapper, content)
    : initNativeScroll(wrapper, content);

  modeMq = window.matchMedia(`(max-width: ${MOBILE_BP}px), (pointer: coarse)`);
  onModeMq = () => {
    const wantLenis = shouldUseLenis();
    const hasLenis = lenis !== null;
    if (wantLenis === hasLenis) return;

    teardownScroll();
    teardownScroll = wantLenis
      ? initLenisScroll(wrapper, content)
      : initNativeScroll(wrapper, content);
    ScrollTrigger.refresh();
  };
  modeMq.addEventListener('change', onModeMq);

  return () => {
    modeMq?.removeEventListener('change', onModeMq);
    modeMq = null;
    onModeMq = null;
    teardownScroll();
  };
}
