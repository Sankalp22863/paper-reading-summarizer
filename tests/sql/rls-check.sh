#!/usr/bin/env bash
# Checks the Supabase row-level security rules in supabase/*.sql against a throwaway
# local Postgres, with stand-ins for Supabase's anon/authenticated roles and auth.uid().
# Usage: tests/sql/rls-check.sh   (needs initdb/pg_ctl/psql on PATH, e.g. brew install postgresql@15)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; DIR="$(mktemp -d)"; PORT=${PGPORT_TEST:-55433}
cleanup() { pg_ctl -D "$DIR/pg" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }; trap cleanup EXIT
initdb -D "$DIR/pg" -U postgres -A trust >/dev/null
pg_ctl -D "$DIR/pg" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$DIR/log" -w start >/dev/null
P() { psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
A=aaaaaaaa-0000-0000-0000-000000000001; B=bbbbbbbb-0000-0000-0000-000000000002
P <<SQL
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid \$\$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema storage; create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id serial, bucket_id text, name text); alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as \$\$ select string_to_array(name,'/') \$\$;
grant usage on schema public to anon, authenticated;
-- Like Supabase: new public tables are granted to anon/authenticated, so RLS must do the work.
alter default privileges in schema public grant all on tables to anon, authenticated;
insert into auth.users values ('$A'),('$B');
SQL
P -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1
P -f "$ROOT/supabase/ratings.sql" >/dev/null 2>&1; P -f "$ROOT/supabase/ratings.sql" >/dev/null 2>&1  # must be re-runnable
fails=0
check() { # role uid expectation(ok|error|<value>) description sql
  local out; out=$(psql -h 127.0.0.1 -p "$PORT" -U postgres -tAq -c "set role $1; select set_config('request.jwt.claim.sub','$2',false); $5" 2>&1 || true)
  if grep -q '^ERROR' <<<"$out"; then out=$(grep '^ERROR' <<<"$out" | head -1); else out=$(tail -1 <<<"$out"); fi
  local ok=0
  case "$3" in error) [[ "$out" == ERROR* ]] && ok=1;; ok) [[ "$out" != ERROR* ]] && ok=1;; *) [[ "$out" == "$3" ]] && ok=1;; esac
  if [[ $ok == 1 ]]; then echo "ok    $4"; else echo "FAIL  $4  (got: $out)"; fails=$((fails+1)); fi; }
K="doi:10.1145/example"
check authenticated $A ok    "A rates a paper 5 stars for Memory"      "insert into public.paper_ratings(user_id,paper_key,category,stars) values ('$A','$K','Memory',5);"
check authenticated $B ok    "B rates the same paper 2 stars (memory)" "insert into public.paper_ratings(user_id,paper_key,category,stars) values ('$B','$K','memory',2);"
check authenticated $A error "A cannot rate as B"                      "insert into public.paper_ratings(user_id,paper_key,category,stars) values ('$B','$K','Compilers',4);"
check authenticated $A error "stars outside 1-5 are rejected"          "insert into public.paper_ratings(user_id,paper_key,category,stars) values ('$A','$K','Compilers',6);"
check anon ""          error "logged-out visitors cannot rate"         "insert into public.paper_ratings(user_id,paper_key,category,stars) values ('$A','$K','X',3);"
check anon ""          error "logged-out visitors cannot read raw ratings" "select count(*) from public.paper_ratings;"
check authenticated $B 1     "B sees only own raw ratings"             "select count(*) from public.paper_ratings;"
check anon ""          "3.5|2" "logged-out visitors read the average (case-insensitive topic)" "select avg_stars||'|'||ratings from public.paper_rating_summary where paper_key='$K';"
check authenticated $B 0     "B cannot change A's rating"              "with u as (update public.paper_ratings set stars=1 where user_id='$A' returning 1) select count(*) from u;"
check authenticated $B 0     "B cannot delete A's rating"              "with d as (delete from public.paper_ratings where user_id='$A' returning 1) select count(*) from d;"
check anon ""          error "the summary exposes no user ids"         "select user_id from public.paper_rating_summary;"
check authenticated $A 1     "A removes own rating"                    "with d as (delete from public.paper_ratings where user_id='$A' returning 1) select count(*) from d;"
check anon ""          "2.0|1" "average updates after removal"         "select avg_stars||'|'||ratings from public.paper_rating_summary where paper_key='$K';"
check anon ""          error "logged-out visitors cannot read private libraries" "select count(*) from public.libraries;"
check authenticated $A ok    "A saves a private library"               "insert into public.libraries(user_id,data) values ('$A','{\"papers\":[],\"goals\":[]}');"
check authenticated $B 0     "B cannot read A's private library"       "select count(*) from public.libraries;"
echo; [[ $fails == 0 ]] && echo "All RLS checks passed." || { echo "$fails RLS check(s) failed."; exit 1; }
