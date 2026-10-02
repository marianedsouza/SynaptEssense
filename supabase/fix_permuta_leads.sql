-- ============================================================
-- SynaptEssence360® — Correção do acesso via PERMUTA
-- Problema: a pessoa que entra via permuta era criada em
-- Authentication, mas o INSERT em protocol_leads falhava por RLS
-- (erro 42501), então ela não aparecia em "contatos de pacientes"
-- nem tinha sessões criadas.
--
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Garantir colunas necessárias em protocol_leads (idempotente)
alter table public.protocol_leads
  add column if not exists email text,
  add column if not exists plan text,
  add column if not exists user_id uuid,
  add column if not exists payment_mode text not null default 'online';

-- Garantir policy de inserção pública (captura de interesse / Protocolo / Pagamento)
drop policy if exists "leads_insert_anon" on public.protocol_leads;
create policy "leads_insert_anon" on public.protocol_leads
  for insert to anon, authenticated with check (true);

-- ============================================================
-- Função: cria apenas o contato do paciente (protocol_leads),
-- contornando o RLS. As sessões/atendimentos NÃO são criados
-- automaticamente — o administrador agenda cada encontro no painel.
-- ============================================================
create or replace function public.create_permuta_access(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_lead public.protocol_leads;
begin
  insert into public.protocol_leads (
    name, phone, email, plan, user_id, modality, payment_mode, created_at
  )
  values (
    payload->>'name',
    payload->>'phone',
    nullif(payload->>'email', ''),
    nullif(payload->>'plan', ''),
    nullif(payload->>'user_id', '')::uuid,
    payload->>'modality',
    'permuta',
    now()
  )
  returning * into new_lead;

  return to_jsonb(new_lead);
end;
$$;

grant execute on function public.create_permuta_access(jsonb) to anon, authenticated;
