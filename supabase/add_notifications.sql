-- ============================================================
-- SynaptEssence360® — Central de notificações (item 10) +
-- notificação nativa (item 9)
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Uma notificação é uma mensagem direcionada ao e-mail de um
-- participante. Aparece na área do participante (central) e,
-- com o navegador aberto e permissão concedida, como
-- notificação nativa (Notification API) via Realtime.
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null default 'info'
    check (type in ('info','success','session','payment','reminder','diagnostic')),
  title text not null,
  message text not null default '',
  link_url text,
  source_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_email
  on public.notifications (email, created_at desc);
create index if not exists idx_notifications_source
  on public.notifications (source_id);

alter table public.notifications enable row level security;

-- Participante lê apenas as próprias notificações (por e-mail no JWT)
drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications
  for select to authenticated
  using (
    email is not null
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Inserção anônima permitida (ex.: conclusão do diagnóstico pelo site)
drop policy if exists "notifications_anon_insert" on public.notifications;
create policy "notifications_anon_insert" on public.notifications
  for insert to anon, authenticated
  with check (email is not null and btrim(email) <> '');

-- Participante marca as próprias como lidas
drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications
  for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- Exclusão para administradores (mantém sigilo entre participantes)
drop policy if exists "notifications_admin_delete" on public.notifications;
create policy "notifications_admin_delete" on public.notifications
  for delete to authenticated using (true);

-- Gera a notificação nativa em tempo real quando a página está aberta
alter publication supabase_realtime add table public.notifications;