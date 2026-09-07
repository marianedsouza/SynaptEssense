-- Lembretes automáticos por e-mail (pagamento pendente + consulta D-1)
-- Rastreia o último e a quantidade de lembretes enviados para evitar duplicidade.

alter table public.payments
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_count integer not null default 0;

alter table public.sessions
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_count integer not null default 0;