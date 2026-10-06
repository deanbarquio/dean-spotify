import gsap from 'gsap';

const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@0123456789ABCDEFXZ';

/** Decode-style text scramble (haoqi nav/labels). Resolves left to right. */
export function scramble(el: HTMLElement, text = el.dataset.text ?? el.textContent ?? '', duration = 0.7) {
  el.dataset.text = text;
  const state = { p: 0 };
  gsap.killTweensOf(state);
  return gsap.to(state, {
    p: 1,
    duration,
    ease: 'none',
    onUpdate() {
      const settled = Math.floor(state.p * text.length);
      let out = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete() {
      el.textContent = text;
    },
  });
}

/** Scramble on hover for every [data-scramble] / [data-scramble-hover] element. */
export function bindScrambleHover(root: ParentNode = document) {
  const els = root.querySelectorAll<HTMLElement>('[data-scramble], [data-scramble-hover]');
  const offs: (() => void)[] = [];
  els.forEach((el) => {
    // Only scramble leaf text; skip elements with child markup
    if (el.children.length) return;
    el.dataset.text = el.textContent ?? '';
    const host = el.closest('a, button') ?? el;
    const on = () => scramble(el, el.dataset.text, 0.5);
    host.addEventListener('mouseenter', on);
    offs.push(() => host.removeEventListener('mouseenter', on));
  });
  return () => offs.forEach((f) => f());
}
