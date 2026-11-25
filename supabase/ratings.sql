-- Community star ratings: how relevant a paper is to each topic, 1–5 stars.
-- Run once in the Supabase SQL editor, after schema.sql. Safe to re-run.
-- Individual ratings are private to their author; everyone (even logged-out
-- visitors) can read only the per-topic averages in paper_rating_summary.

create table if not exists public.paper_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_key text not null check (char_length(paper_key) between 5 and 300),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_key, category)
);
create index if not exists paper_ratings_key on public.paper_ratings (paper_key);

alter table public.paper_ratings enable row level security;
revoke all on public.paper_ratings from anon, authenticated;
grant select, insert, update, delete on public.paper_ratings to authenticated;

drop policy if exists "Read own ratings" on public.paper_ratings;
drop policy if exists "Add own ratings" on public.paper_ratings;
drop policy if exists "Change own ratings" on public.paper_ratings;
drop policy if exists "Remove own ratings" on public.paper_ratings;
create policy "Read own ratings" on public.paper_ratings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own ratings" on public.paper_ratings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own ratings" on public.paper_ratings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own ratings" on public.paper_ratings for delete to authenticated using ((select auth.uid()) = user_id);

-- Averages only: no user ids. The view runs with its owner's rights so it can
-- aggregate everyone's ratings while the table itself stays owner-only.
create or replace view public.paper_rating_summary as
  select paper_key, min(btrim(category)) as category, round(avg(stars)::numeric, 1) as avg_stars, count(*)::int as ratings
  from public.paper_ratings
  group by paper_key, lower(btrim(category));
revoke all on public.paper_rating_summary from anon, authenticated;
grant select on public.paper_rating_summary to anon, authenticated;
