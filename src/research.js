const stop = new Set('the a an and or of in on to for with from by is are was were this that as at we our using study paper method based via into'.split(' '));
export function tokens(text = '') { return [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w)))]; }
export function suggestGroups(paper, library) {
  const input = new Set(tokens([paper.title, paper.abstract, paper.takeaway, paper.notes, paper.methods].join(' ')));
  const groups = new Map();
  for (const item of library.filter(p => p.id !== paper.id && p.status === 'Read')) {
    for (const group of item.groups || []) {
      const entry = groups.get(group) || { words: new Set(tokens(group)), titles: [] };
      tokens([item.title, item.abstract, item.takeaway, item.notes, item.methods].join(' ')).forEach(w => entry.words.add(w));
      entry.titles.push(item.title); groups.set(group, entry);
    }
  }
  return [...groups].map(([name, group]) => {
    const matches = [...input].filter(w => group.words.has(w));
    return { name, score: matches.length / Math.sqrt(Math.max(input.size * group.words.size, 1)), matches, evidence: group.titles };
  }).filter(g => g.matches.length >= 2 && g.score >= 0.08).sort((a,b) => b.score-a.score).slice(0,3);
}
export function relatedPapers(paper, library) {
  const words = new Set(tokens(`${paper.title} ${paper.takeaway}`));
  return library.filter(p => p.id !== paper.id).map(p => ({...p, relevance: (p.groups || []).filter(g => paper.groups?.includes(g)).length * 3 + tokens(`${p.title} ${p.takeaway}`).filter(t => words.has(t)).length})).filter(p => p.relevance > 0).sort((a,b) => b.relevance-a.relevance).slice(0,3);
}
export function goalProgress(goal, papers) {
  return papers.filter(p => p.status === 'Read' && p.completedAt?.slice(0,7) === goal.month && (!goal.group || p.groups.includes(goal.group))).length;
}
export function safeUrl(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
export function draftTakeaway(notes) { return (notes || '').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0,2).join(' ').slice(0,500); }
export function goalSuggestions(papers) {
  const reading = papers.filter(p => p.status === 'Reading');
  const missing = papers.filter(p => p.status === 'Read' && !p.takeaway);
  return [reading.length ? `Finish ${Math.min(reading.length, 3)} papers already in progress` : 'Read and summarize 4 papers this month', missing.length ? `Add a takeaway to ${missing.length} read papers` : 'Write a comparison of two papers in your largest topic group', 'Read one paper that challenges your current approach'];
}
