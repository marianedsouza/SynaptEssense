-- ============================================================
-- SynaptEssence360® — Área do usuário (protocolo/pagamentos)
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Adicionar colunas para associar o lead ao usuário e ao plano escolhido
alter table public.protocol_leads
  add column if not exists email text,
  add column if not exists plan text check (plan in ('mensal', 'completo')),
  add column if not exists user_id uuid;

-- Adicionar coluna de plano em pagamentos
alter table public.payments
  add column if not exists plan text check (plan in ('mensal', 'completo'));

-- Índices auxiliares
create index if not exists idx_protocol_leads_email on public.protocol_leads (email);
create index if not exists idx_protocol_leads_user_id on public.protocol_leads (user_id);
create index if not exists idx_payments_payer_email on public.payments (payer_email);

-- Permitir que o usuário autenticado leia apenas os próprios pagamentos (por e-mail)
drop policy if exists "payments_user_read_own" on public.payments;
create policy "payments_user_read_own" on public.payments
  for select to authenticated
  using (
    payer_email is not null
    and lower(payer_email) = lower(auth.jwt() ->> 'email')
  );

-- Permitir que o usuário autenticado leia apenas os próprios interesses/protocolos
drop policy if exists "leads_user_read_own" on public.protocol_leads;
create policy "leads_user_read_own" on public.protocol_leads
  for select to authenticated
  using (
    email is not null
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
