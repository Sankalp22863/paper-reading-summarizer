// Shares star ratings with other readers (see supabase/ratings.sql).
import {cloud} from './storage';
import {ratingRows} from './ratings-core';

export const RATINGS_SETUP = 'Community ratings are not set up yet: run supabase/ratings.sql once in your Supabase SQL editor.';
function friendly(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`;
  if (/42P01|PGRST205|does not exist|could not find the table|schema cache/i.test(text)) return new Error(RATINGS_SETUP);
  return error instanceof Error ? error : new Error(error?.message || 'Ratings request failed.');
}
const check = ({data, error}) => { if (error) throw friendly(error); return data; };

/** Make this account's rows match the library's ratings. Returns the number of ratings shared. */
export async function syncRatings(papers, user) {
  const wanted = ratingRows(papers);
  const id = r => `${r.paper_key}\u0000${r.category.toLowerCase()}`;
  const keep = new Set(wanted.map(id));
  const found = check(await cloud.from('paper_ratings').select('paper_key,category').eq('user_id', user.id));
  const existing = Array.isArray(found) ? found : [];
  const stale = existing.filter(r => !keep.has(id(r)));
  // Remove first, so a cleared rating disappears even if adding others fails.
  for (const row of stale) check(await cloud.from('paper_ratings').delete().eq('user_id', user.id).eq('paper_key', row.paper_key).eq('category', row.category));
  if (wanted.length) {
    const now = new Date().toISOString();
    check(await cloud.from('paper_ratings').upsert(wanted.map(r => ({...r, user_id: user.id, updated_at: now}))));
  }
  return wanted.length;
}
/** Average stars per topic for the given paper keys: {key: [{category, avg_stars, ratings}]}. */
export async function loadSummaries(keys) {
  const unique = [...new Set(keys)].filter(Boolean);
  if (!cloud || !unique.length) return {};
  const rows = check(await cloud.from('paper_rating_summary').select('paper_key,category,avg_stars,ratings').in('paper_key', unique));
  const out = {};
  for (const row of rows) (out[row.paper_key] ||= []).push({category: row.category, avg: Number(row.avg_stars), ratings: row.ratings});
  for (const list of Object.values(out)) list.sort((a, b) => b.avg - a.avg || b.ratings - a.ratings);
  return out;
}
