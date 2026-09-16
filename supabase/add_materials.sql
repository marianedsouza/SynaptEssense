-- ============================================================
-- SynaptEssence360® — Materiais e meditação
-- Execute este arquivo no SQL Editor do Supabase.
-- O analista cadastra materiais (áudio de meditação e PDF)
-- que ficam disponíveis na área do participante.
-- ============================================================

-- Materiais
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('audio', 'pdf')),
  description text,
  duration text,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materials_type on public.materials (type);
create index if not exists idx_materials_active on public.materials (active);

-- RLS (mesmo padrão permissivo já adotado no restante do projeto:
-- leitura para todos, gravação apenas para autenticados — o painel
-- admin é protegido por rota)
alter table public.materials enable row level security;

drop policy if exists "materials_read_all" on public.materials;
create policy "materials_read_all" on public.materials
  for select to anon, authenticated using (true);

drop policy if exists "materials_insert_authenticated" on public.materials;
create policy "materials_insert_authenticated" on public.materials
  for insert to authenticated with check (true);

drop policy if exists "materials_update_authenticated" on public.materials;
create policy "materials_update_authenticated" on public.materials
  for update to authenticated using (true);

drop policy if exists "materials_delete_authenticated" on public.materials;
create policy "materials_delete_authenticated" on public.materials
  for delete to authenticated using (true);

-- Atualizar updated_at automaticamente
drop trigger if exists set_updated_at_materials on public.materials;
create trigger set_updated_at_materials
  before update on public.materials
  for each row
  execute function public.update_updated_at();

-- Bucket público "materials" (áudio e PDF acessíveis ao participante)
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do update set public = true;

drop policy if exists "materials_public_read" on storage.objects;
create policy "materials_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'materials');

drop policy if exists "materials_auth_insert" on storage.objects;
create policy "materials_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'materials');

drop policy if exists "materials_auth_update" on storage.objects;
create policy "materials_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'materials');

drop policy if exists "materials_auth_delete" on storage.objects;
create policy "materials_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'materials');