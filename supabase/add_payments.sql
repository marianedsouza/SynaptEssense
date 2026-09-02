-- ============================================================
-- SynaptEssence360® — Tabela de pagamentos (Mercado Pago)
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Tabela de pagamentos
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.protocol_leads(id) on delete set null,
  modality text not null check (modality in ('social', 'integral')),
  amount numeric(10,2) not null,
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'error')),
  mp_payment_id text,
  mp_preference_id text,
  payer_name text,
  payer_email text,
  payer_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_lead_id on public.payments (lead_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_mp_payment_id on public.payments (mp_payment_id);

-- RLS
alter table public.payments enable row level security;

-- Pagamentos: leitura para administradores autenticados
drop policy if exists "payments_admin_read" on public.payments;
create policy "payments_admin_read" on public.payments
  for select to authenticated using (true);

-- Pagamentos: inserção via function (security definer)
drop policy if exists "payments_insert_anon" on public.payments;
create policy "payments_insert_anon" on public.payments
  for insert to anon, authenticated with check (true);

-- Pagamentos: update para administradores autenticados
drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
  for update to authenticated using (true);

-- Garantir que protocol_leads existe (caso não tenha sido criado antes)
create table if not exists public.protocol_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  modality text not null check (modality in ('social', 'integral')),
  created_at timestamptz not null default now()
);

alter table public.protocol_leads enable row level security;

drop policy if exists "leads_insert_anon" on public.protocol_leads;
create policy "leads_insert_anon" on public.protocol_leads
  for insert to anon, authenticated with check (true);

drop policy if exists "leads_admin_read" on public.protocol_leads;
create policy "leads_admin_read" on public.protocol_leads
  for select to authenticated using (true);

drop policy if exists "leads_admin_delete" on public.protocol_leads;
create policy "leads_admin_delete" on public.protocol_leads
  for delete to authenticated using (true);

-- Atualizar.updated_at automaticamente
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at
  before update on public.payments
  for each row
  execute function public.update_updated_at();
