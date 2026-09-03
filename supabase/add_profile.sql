-- ============================================================
-- SynaptEssence360® — Perfil do paciente + horário na agenda
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Horário do atendimento na sessão (agenda)
alter table public.sessions
  add column if not exists time text;

-- Arquétipo dominante do paciente (perfil)
alter table public.protocol_leads
  add column if not exists archetype text;

-- Observações das sessões ficam no campo notes de sessions (já existente).
