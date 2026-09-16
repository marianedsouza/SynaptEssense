-- ============================================================
-- SynaptEssence360® — Acesso via permuta / pagamento combinado
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

-- Forma de pagamento do protocolo:
--   'online'  -> pagamento online (Mercado Pago)
--   'permuta' -> permuta ou pagamento em dinheiro combinado com a analista
alter table public.protocol_leads
  add column if not exists payment_mode text not null default 'online'
  check (payment_mode in ('online', 'permuta'));