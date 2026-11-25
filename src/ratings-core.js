// Pure helpers for topic relevance ratings (no network), shared by the app and tests.

/** Stable identifiers for a paper, best first: DOI, arXiv ID, normalized title. */
export function paperKeys(paper = {}) {
  const keys = [];
  const url = String(paper.url || '');
  const doi = (paper.doi || url.match(/doi\.org\/(10\.\d{4,9}\/[^\s?#]+)/i)?.[1] || '').trim();
  if (doi) keys.push(`doi:${decodeURIComponent(doi).toLowerCase().replace(/[.,;]+$/, '')}`);
  const arxiv = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})/i)?.[1];
  if (arxiv) keys.push(`arxiv:${arxiv.toLowerCase()}`);
  const title = String(paper.title || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
  if (title.length >= 10) keys.push(`title:${title.slice(0, 280)}`);
  return keys;
}
/** Keep only 1–5 star ratings for topics the paper actually has. */
export function cleanRatings(ratings = {}, groups = []) {
  const wanted = new Map(groups.map(g => [g.trim().toLowerCase(), g.trim()]));
  const out = {};
  for (const [category, stars] of Object.entries(ratings || {})) {
    const name = wanted.get(category.trim().toLowerCase());
    const value = Math.round(Number(stars));
    if (name && value >= 1 && value <= 5) out[name] = value;
  }
  return out;
}
/** One row per (paper key, topic) for every rated paper in the library. */
export function ratingRows(papers) {
  const rows = new Map();
  for (const paper of papers) {
    const ratings = cleanRatings(paper.ratings, paper.groups || []);
    for (const key of paperKeys(paper)) for (const [category, stars] of Object.entries(ratings)) {
      rows.set(`${key}\u0000${category.toLowerCase()}`, {paper_key: key, category, stars});
    }
  }
  return [...rows.values()];
}
/** Pick the best-identified summary for a paper: DOI over arXiv over title. */
export function summaryFor(paper, summaries) {
  for (const key of paperKeys(paper)) if (summaries[key]?.length) return summaries[key];
  return [];
}
