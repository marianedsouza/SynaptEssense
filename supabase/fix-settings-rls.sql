-- ============================================================
-- SynaptEssence360® — Corrigir leitura pública das configurações
-- Execute no SQL Editor do Supabase.
-- A home (visitante anônimo) precisa ler a tabela settings.
-- ============================================================

alter table public.settings enable row level security;

grant select on public.settings to anon, authenticated;
grant all on public.settings to authenticated;

-- Leitura pública (visitante + admin)
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated using (true);

-- Edição somente admin autenticado
drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all to authenticated using (true) with check (true);
