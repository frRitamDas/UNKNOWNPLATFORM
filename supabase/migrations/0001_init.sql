-- ─────────────────────────────────────────────────────────────────────────────
-- Reelforge — initial schema
-- Run this in Supabase → SQL Editor (or `supabase db push`).
-- Safe to run twice: every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

-- ── projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  title          text not null default 'Untitled edit',
  status         text not null default 'draft'
                 check (status in ('draft','transcribing','ready','rendering','exported','failed')),
  doc            jsonb not null,
  thumbnail_url  text,
  duration_ms    integer not null default 0,
  aspect         text not null default '9:16',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

-- ── renders (queue consumed by worker/index.mjs) ────────────────────────────
create table if not exists public.renders (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  status       text not null default 'queued'
               check (status in ('queued','processing','done','failed')),
  progress     integer not null default 0,
  engine       text not null default 'ffmpeg',
  output_path  text,
  error        text,
  options      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

create index if not exists renders_queue_idx on public.renders (status, created_at) where status = 'queued';
create index if not exists renders_project_idx on public.renders (project_id, created_at desc);

-- ── triggers ────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.renders  enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "projects: read own" on public.projects;
create policy "projects: read own" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "projects: insert own" on public.projects;
create policy "projects: insert own" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects: update own" on public.projects;
create policy "projects: update own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects: delete own" on public.projects;
create policy "projects: delete own" on public.projects
  for delete using (auth.uid() = user_id);

drop policy if exists "renders: read own" on public.renders;
create policy "renders: read own" on public.renders
  for select using (auth.uid() = user_id);

drop policy if exists "renders: insert own" on public.renders;
create policy "renders: insert own" on public.renders
  for insert with check (auth.uid() = user_id);

-- ── storage ─────────────────────────────────────────────────────────────────
-- One private bucket. Path convention: <user_id>/<project_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 262144000,
  array['video/mp4','video/quicktime','video/webm','video/x-matroska','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','image/png','image/jpeg']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists "media: read own folder" on storage.objects;
create policy "media: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media: write own folder" on storage.objects;
create policy "media: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media: update own folder" on storage.objects;
create policy "media: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media: delete own folder" on storage.objects;
create policy "media: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── convenience view: render queue depth ────────────────────────────────────
create or replace view public.render_queue_depth as
select
  count(*) filter (where status = 'queued')     as queued,
  count(*) filter (where status = 'processing') as processing,
  count(*) filter (where status = 'failed')     as failed
from public.renders;
