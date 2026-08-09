-- StudyMind AI: Supabase setup
-- Run this entire file in Supabase SQL Editor.

create table if not exists public.documents (
  id text primary key,
  name text not null,
  type text,
  uploaded_at timestamptz not null default now(),
  chunk_count integer not null default 0
);

create table if not exists public.chunks (
  id text primary key,
  doc_id text not null references public.documents(id) on delete cascade,
  doc_name text not null,
  chunk_index integer not null,
  text text not null
);

create index if not exists chunks_doc_id_idx on public.chunks(doc_id);

alter table public.documents enable row level security;
alter table public.chunks enable row level security;

-- No public database policies are created. The Vercel API uses the
-- server-only service_role key, which bypasses RLS.

insert into storage.buckets (id, name, public)
values ('studymind-files', 'studymind-files', false)
on conflict (id) do nothing;

-- The browser uploads temporary files directly to Supabase Storage.
-- The application is intentionally anonymous, matching the original app.
-- The Vercel API removes the temporary object after extraction.
drop policy if exists "StudyMind anonymous temporary uploads" on storage.objects;
create policy "StudyMind anonymous temporary uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'studymind-files');
