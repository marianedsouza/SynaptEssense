-- ============================================================
-- SynaptEssence360® — Sistema de mensagens (item 14 do roadmap)
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Mensagens 1:1 entre a analista e o participante. O thread é
-- identificado pelo e-mail do participante (mesmo vínculo das
-- notificações e da área do usuário). Atualizam em tempo real
-- via Realtime quando a página está aberta.
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  sender text not null check (sender in ('analyst','participant')),
  body text not null check (btrim(body) <> ''),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_email
  on public.messages (email, created_at asc);

alter table public.messages enable row level security;

-- Analista acessa todas as mensagens (o painel já segue esse modelo)
drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all" on public.messages
  for all to authenticated using (true) with check (true);

-- Participante lê as próprias mensagens
drop policy if exists "messages_user_read_own" on public.messages;
create policy "messages_user_read_own" on public.messages
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Participante envia apenas no próprio thread
drop policy if exists "messages_user_insert_own" on public.messages;
create policy "messages_user_insert_own" on public.messages
  for insert to authenticated
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- Participante marca as próprias como lidas
drop policy if exists "messages_user_update_own" on public.messages;
create policy "messages_user_update_own" on public.messages
  for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- Mensagens novas chegam em tempo real
alter publication supabase_realtime add table public.messages;