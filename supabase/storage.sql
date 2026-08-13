-- ============================================================
-- SynaptEssence360® — Storage (foto da analista)
-- Execute no SQL Editor do Supabase (uma única vez).
-- ============================================================

-- Bucket público "assets" (a foto precisa ser acessível sem login)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = true;

-- Leitura pública da foto
drop policy if exists "assets_public_read" on storage.objects;
create policy "assets_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'assets');

-- Upload/exclusão apenas para usuários autenticados (admin)
drop policy if exists "assets_auth_insert" on storage.objects;
create policy "assets_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'assets');

drop policy if exists "assets_auth_update" on storage.objects;
create policy "assets_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'assets');

drop policy if exists "assets_auth_delete" on storage.objects;
create policy "assets_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'assets');
