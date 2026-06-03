/** Shared lyrics panel behavior (matches EducationSection.astro). */

export const LYRIC_LINE_DIM = 'rgba(0, 0, 0, 0.45)';
export const LYRIC_LINE_ACTIVE = '#ffffff';

export const LYRIC_LINE_STYLE =
  'font-size:clamp(1.3rem, 2.5vw, 1.8rem);font-weight:800;color:rgba(0,0,0,0.45);margin:0;line-height:1.3;letter-spacing:-0.02em;cursor:pointer;transition:color 0.25s, opacity 0.25s, transform 0.25s;transform-origin:left;';

export const LYRIC_LINE_ACTIVE_STYLE =
  'font-size:clamp(1.3rem, 2.5vw, 1.8rem);font-weight:800;color:#fff;margin:0;line-height:1.3;letter-spacing:-0.02em;cursor:pointer;transition:color 0.25s, opacity 0.25s, transform 0.25s;transform-origin:left;';

export const LYRICS_CONTAINER_STYLE =
  'flex:1;overflow-y:auto;position:relative;z-index:2;display:flex;flex-direction:column;gap:20px;padding-right:10px;padding-top:40px;padding-bottom:120px;scroll-behavior:smooth;';

export function renderLyricLines(lyrics: string[]): string {
  return lyrics
    .map(
      (line, idx) =>
        `<p class="lyric-line${idx === 0 ? ' active' : ''}" style="${idx === 0 ? LYRIC_LINE_ACTIVE_STYLE : LYRIC_LINE_STYLE}">${line}</p>`
    )
    .join('');
}

export function activateLyricLine(
  container: HTMLElement,
  lines: NodeListOf<HTMLElement> | HTMLElement[],
  line: HTMLElement,
  options: { scroll?: boolean } = {}
): number {
  const scroll = options.scroll !== false;
  const list = Array.from(lines);

  list.forEach((l) => {
    l.classList.remove('active');
    l.style.color = LYRIC_LINE_DIM;
  });

  line.classList.add('active');
  line.style.color = LYRIC_LINE_ACTIVE;

  if (scroll) {
    const containerHeight = container.clientHeight;
    const lineOffset = line.offsetTop;
    const lineHeight = line.clientHeight;
    container.scrollTo({
      top: lineOffset - containerHeight / 2 + lineHeight / 2,
      behavior: 'smooth',
    });
  }

  return list.indexOf(line);
}

/** Same click-to-center behavior as EducationSection. */
export function initLyricsPanel(root: ParentNode, onActivate?: (index: number) => void): void {
  const container = root.querySelector('.lyrics-container') as HTMLElement | null;
  if (!container) return;

  const lines = container.querySelectorAll('.lyric-line') as NodeListOf<HTMLElement>;
  if (!lines.length) return;

  lines.forEach((line) => {
    const bound = line.cloneNode(true) as HTMLElement;
    line.replaceWith(bound);
  });

  const freshLines = container.querySelectorAll('.lyric-line') as NodeListOf<HTMLElement>;
  freshLines.forEach((line) => {
    line.addEventListener('click', () => {
      const idx = activateLyricLine(container, freshLines, line);
      onActivate?.(idx);
    });
  });
}

export function lyricIndexFromFraction(lineCount: number, fraction: number): number {
  if (lineCount <= 1) return 0;
  return Math.min(lineCount - 1, Math.max(0, Math.round(fraction * (lineCount - 1))));
}

export function syncLyricsFromFraction(root: ParentNode, fraction: number): number {
  const container = root.querySelector('.lyrics-container') as HTMLElement | null;
  if (!container) return 0;

  const lines = container.querySelectorAll('.lyric-line') as NodeListOf<HTMLElement>;
  if (!lines.length) return 0;

  const idx = lyricIndexFromFraction(lines.length, fraction);
  activateLyricLine(container, lines, lines[idx] as HTMLElement);
  return idx;
}
