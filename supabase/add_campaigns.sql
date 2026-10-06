-- ============================================================
-- SynaptEssence360® — Gerenciador de campanhas (item 7 do roadmap)
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Uma campanha é um link rastreável: cada campanha tem um slug
-- que vira ?ref= na URL. As visitas caem em tracking_events.ref
-- e aparecem no painel Tracking por origem. O QR Code (item 8)
-- é gerado no painel a partir do link da campanha.
-- ============================================================

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text not null unique,
  path text not null default '/',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_slug on public.campaigns (slug);

alter table public.campaigns enable row level security;

-- Gestão apenas pelo painel autenticado
drop policy if exists "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns
  for select to authenticated using (true);

drop policy if exists "campaigns_insert" on public.campaigns;
create policy "campaigns_insert" on public.campaigns
  for insert to authenticated with check (true);

drop policy if exists "campaigns_update" on public.campaigns;
create policy "campaigns_update" on public.campaigns
  for update to authenticated using (true) with check (true);

drop policy if exists "campaigns_delete" on public.campaigns;
create policy "campaigns_delete" on public.campaigns
  for delete to authenticated using (true);