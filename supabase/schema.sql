-- Run once in the Supabase SQL editor. No service-role key belongs in the frontend.
create table public.libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"papers":[],"goals":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint valid_library check (jsonb_typeof(data->'papers') = 'array' and jsonb_typeof(data->'goals') = 'array')
);
alter table public.libraries enable row level security;
revoke all on public.libraries from anon;
grant select, insert, update, delete on public.libraries to authenticated;
create policy "Read own library" on public.libraries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own library" on public.libraries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own library" on public.libraries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own library" on public.libraries for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', false, 26214400, array['application/pdf']);
create policy "Read own PDFs" on storage.objects for select to authenticated
using (bucket_id = 'papers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own PDFs" on storage.objects for insert to authenticated
with check (bucket_id = 'papers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own PDFs" on storage.objects for delete to authenticated
using (bucket_id = 'papers' and (storage.foldername(name))[1] = (select auth.uid())::text);
