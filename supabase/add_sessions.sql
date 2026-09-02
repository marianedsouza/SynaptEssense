-- ============================================================
-- SynaptEssence360® — Agenda de atendimentos (sessões)
-- Execute este arquivo no SQL Editor do Supabase.
-- O administrador cadastra as datas de cada atendimento e marca
-- como realizada/faltou. O participante acompanha as datas e a
-- quantidade de sessões restantes.
-- ============================================================

-- Sessões / atendimentos por lead
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.protocol_leads(id) on delete cascade,
  date date not null,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'faltou')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_lead_id on public.sessions (lead_id);
create index if not exists idx_sessions_date on public.sessions (date);

-- RLS (mesmo padrão permissivo já adotado para payments/protocol_leads)
alter table public.sessions enable row level security;

drop policy if exists "sessions_read_authenticated" on public.sessions;
create policy "sessions_read_authenticated" on public.sessions
  for select to authenticated using (true);

drop policy if exists "sessions_insert_authenticated" on public.sessions;
create policy "sessions_insert_authenticated" on public.sessions
  for insert to authenticated with check (true);

drop policy if exists "sessions_update_authenticated" on public.sessions;
create policy "sessions_update_authenticated" on public.sessions
  for update to authenticated using (true);

drop policy if exists "sessions_delete_authenticated" on public.sessions;
create policy "sessions_delete_authenticated" on public.sessions
  for delete to authenticated using (true);

-- Atualizar updated_at automaticamente
drop trigger if exists set_updated_at_sessions on public.sessions;
create trigger set_updated_at_sessions
  before update on public.sessions
  for each row
  execute function public.update_updated_at();
