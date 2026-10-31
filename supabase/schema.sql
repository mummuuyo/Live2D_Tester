-- Live2D Studio model catalog for Supabase
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.live2d_models (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{4}$'),
  name text not null,
  cloudflare_url text not null check (cloudflare_url ~ '^https://'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.live2d_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.live2d_models enable row level security;
alter table public.live2d_admins enable row level security;

revoke all on table public.live2d_models from anon, authenticated;
grant select (cloudflare_url, created_at) on table public.live2d_models to anon;
grant select, insert, update, delete on table public.live2d_models to authenticated;

revoke all on table public.live2d_admins from anon, authenticated;
grant select on table public.live2d_admins to authenticated;

drop policy if exists "Public can list enabled models" on public.live2d_models;
create policy "Public can list enabled models"
  on public.live2d_models for select to anon
  using (enabled = true);

drop policy if exists "Admins can read models" on public.live2d_models;
create policy "Admins can read models"
  on public.live2d_models for select to authenticated
  using (exists (
    select 1 from public.live2d_admins a
    where a.user_id = (select auth.uid())
  ));

drop policy if exists "Admins can add models" on public.live2d_models;
create policy "Admins can add models"
  on public.live2d_models for insert to authenticated
  with check (exists (
    select 1 from public.live2d_admins a
    where a.user_id = (select auth.uid())
  ));

drop policy if exists "Admins can edit models" on public.live2d_models;
create policy "Admins can edit models"
  on public.live2d_models for update to authenticated
  using (exists (
    select 1 from public.live2d_admins a
    where a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.live2d_admins a
    where a.user_id = (select auth.uid())
  ));

drop policy if exists "Admins can remove models" on public.live2d_models;
create policy "Admins can remove models"
  on public.live2d_models for delete to authenticated
  using (exists (
    select 1 from public.live2d_admins a
    where a.user_id = (select auth.uid())
  ));

drop policy if exists "Admins can check their own access" on public.live2d_admins;
create policy "Admins can check their own access"
  on public.live2d_admins for select to authenticated
  using (user_id = (select auth.uid()));
