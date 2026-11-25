// Cheeky "paper stack" stats: how tall your read pile would be in A4 sheets.
export const DEFAULT_PAGES = 12;          // typical conference paper, used when page count is unknown
export const SHEET_MM = 0.1;              // one 80 gsm A4 sheet
export const WORDS_PER_PAGE = 800;        // two-column paper, roughly
const MOON_MM = 384400 * 1e6;             // average Earth–Moon distance
const SHEETS_PER_TREE = 8333;
const GATSBY_WORDS = 47094;
const LANDMARKS = [
  ['a credit card', 0.76], ['a pancake', 6], ['a stack of Pringles', 230], ['a cat sitting very still', 250],
  ['a fire hydrant', 600], ['your fridge', 1800], ['a double-decker bus', 4400], ['a giraffe', 5500],
  ['the Leaning Tower of Pisa', 56000], ['the Eiffel Tower', 330000], ['Mount Everest', 8849000],
  ['the International Space Station', 408e6], ['the Moon', MOON_MM],
];
const pagesOf = p => Number(p.pages) > 0 ? Number(p.pages) : DEFAULT_PAGES;
export function formatHeight(mm) {
  if (mm < 10) return `${mm.toFixed(1)} mm`;
  if (mm < 1000) return `${(mm / 10).toFixed(1)} cm`;
  if (mm < 1e6) return `${(mm / 1000).toFixed(2)} m`;
  return `${(mm / 1e6).toFixed(2)} km`;
}
export function formatPercent(pct) {
  if (pct === 0) return '0%';
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  const digits = Math.min(Math.ceil(-Math.log10(pct)) + 1, 20);
  return `${pct.toFixed(digits)}%`;
}
export function paperStack(papers) {
  const read = papers.filter(p => p.status === 'Read');
  const queued = papers.filter(p => p.status !== 'Read');
  const pages = read.reduce((n, p) => n + pagesOf(p), 0);
  const queuedPages = queued.reduce((n, p) => n + pagesOf(p), 0);
  const estimated = read.some(p => !(Number(p.pages) > 0));
  const mm = pages * SHEET_MM;
  const passed = [...LANDMARKS].reverse().find(([, h]) => h <= mm) || null;
  const next = LANDMARKS.find(([, h]) => h > mm) || null;
  const perPaper = mm / Math.max(read.length, 1) || DEFAULT_PAGES * SHEET_MM;
  const papersToNext = next ? Math.ceil((next[1] - mm) / perPaper) : 0;
  const words = pages * WORDS_PER_PAGE;
  return {
    papers: read.length, pages, estimated, mm, height: formatHeight(mm),
    passed: passed?.[0] || null, next: next?.[0] || null, papersToNext,
    moon: formatPercent(mm / MOON_MM * 100),
    tree: formatPercent(pages / SHEETS_PER_TREE * 100),
    words, gatsbys: (words / GATSBY_WORDS).toFixed(1).replace(/\.0$/, ''),
    queued: queued.length, queuedPages, queuedHeight: formatHeight(queuedPages * SHEET_MM),
  };
}
