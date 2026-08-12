-- ============================================================
-- SynaptEssence360® — Esquema do banco de dados
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Versões do questionário
create table if not exists public.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Banco de perguntas (configurável por versão)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  qid text not null,
  version text not null default 'v0.1',
  axis text not null,
  ord int not null,
  type text not null check (type in ('likert','open','single','multiple','text')),
  text text not null,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  module text not null default 'person' check (module in ('person','brand')),
  archetype text,
  created_at timestamptz not null default now(),
  unique (qid, version)
);

-- Participantes / levantamentos
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  city text,
  state text,
  birth_date text,
  age int,
  field text,
  experience_time text,
  organization text,
  survey_for text,
  status text not null default 'iniciado' check (status in ('iniciado','em_andamento','concluido')),
  progress int not null default 0,
  answers jsonb not null default '{}'::jsonb,
  identification jsonb,
  questionnaire_version text not null default 'v0.1',
  consent boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  completed_time_seconds int
);

create index if not exists idx_participants_created_at on public.participants (created_at desc);
create index if not exists idx_participants_status on public.participants (status);

-- Notas do analista (privadas)
create table if not exists public.analyst_notes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  impressions text not null default '',
  observations text not null default '',
  deepening text not null default '',
  potentials text not null default '',
  attention_points text not null default '',
  next_steps text not null default '',
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

-- Configurações institucionais
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.participants enable row level security;
alter table public.analyst_notes enable row level security;
alter table public.settings enable row level security;
alter table public.questions enable row level security;
alter table public.questionnaire_versions enable row level security;

-- Participantes: NENHUM acesso público direto.
-- O acesso é feito exclusivamente pelas funções (RPC) abaixo.

-- Notas do analista: somente usuários autenticados (admin)
drop policy if exists "notes_admin_all" on public.analyst_notes;
create policy "notes_admin_all" on public.analyst_notes
  for all to authenticated using (true) with check (true);

-- Configurações: leitura pública (textos institucionais exibidos ao participante)
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated using (true);

-- Configurações: edição somente por usuários autenticados (admin)
drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all to authenticated using (true) with check (true);

-- Banco de perguntas: leitura pública (questionário)
drop policy if exists "questions_public_read" on public.questions;
create policy "questions_public_read" on public.questions
  for select to anon, authenticated using (true);

drop policy if exists "versions_public_read" on public.questionnaire_versions;
create policy "versions_public_read" on public.questionnaire_versions
  for select to anon, authenticated using (true);

-- Participantes: leitura para administradores autenticados
drop policy if exists "participants_admin_read" on public.participants;
create policy "participants_admin_read" on public.participants
  for select to authenticated using (true);

drop policy if exists "participants_admin_update" on public.participants;
create policy "participants_admin_update" on public.participants
  for update to authenticated using (true);

-- ============================================================
-- Funções RPC (acesso do participante anônimo)
-- O participante só opera o próprio registro pelo id.
-- ============================================================

create or replace function public.create_participant(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.participants;
begin
  insert into public.participants (
    name, email, city, state, birth_date, age, field, experience_time,
    organization, survey_for, status, progress, answers, identification,
    questionnaire_version, consent, started_at
  )
  values (
    payload->>'name',
    payload->>'email',
    payload->>'city',
    payload->>'state',
    payload->>'birth_date',
    nullif(payload->>'age', '')::int,
    payload->>'field',
    payload->>'experience_time',
    payload->>'organization',
    payload->>'survey_for',
    'em_andamento',
    0,
    coalesce(payload->'answers', '{}'::jsonb),
    payload->'identification',
    payload->>'questionnaire_version',
    coalesce((payload->>'consent')::boolean, false),
    coalesce(payload->>'started_at', now()::text)::timestamptz
  )
  returning * into result;

  return to_jsonb(result);
end;
$$;

create or replace function public.get_participant(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.participants;
begin
  select * into result from public.participants where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(result);
end;
$$;

create or replace function public.save_participant_answers(
  p_id uuid,
  p_answers jsonb,
  p_progress int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.participants
  set answers = p_answers,
      progress = least(greatest(p_progress, 0), 100)
  where id = p_id;
end;
$$;

create or replace function public.complete_participant(
  p_id uuid,
  p_answers jsonb,
  p_progress int,
  p_time_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.participants
  set answers = p_answers,
      progress = 100,
      status = 'concluido',
      completed_at = now(),
      completed_time_seconds = p_time_seconds
  where id = p_id;
end;
$$;

grant execute on function public.create_participant(jsonb) to anon, authenticated;
grant execute on function public.get_participant(uuid) to anon, authenticated;
grant execute on function public.save_participant_answers(uuid, jsonb, int) to anon, authenticated;
grant execute on function public.complete_participant(uuid, jsonb, int, int) to anon, authenticated;
