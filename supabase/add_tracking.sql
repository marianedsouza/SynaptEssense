-- ============================================================
-- SynaptEssence360® — Tracking de links e comportamento
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Cada linha é um evento de um visitante (anônimo):
--   page_view / page_leave  → onde o usuário entra e onde para
--   (page_leave guarda scroll_depth e time_on_page_ms)
--   diagnostic_*            → o que ele faz no diagnóstico
--   email_capture           → e-mail capturado antes das perguntas
--   payment_click           → clique para ir ao pagamento
-- ============================================================

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  session_id text,
  ref text,
  path text not null,
  event text not null,
  detail jsonb,
  scroll_depth integer,
  time_on_page_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracking_events_created_at
  on public.tracking_events (created_at desc);
create index if not exists idx_tracking_events_visitor_id
  on public.tracking_events (visitor_id);
create index if not exists idx_tracking_events_event
  on public.tracking_events (event);
create index if not exists idx_tracking_events_ref
  on public.tracking_events (ref);

alter table public.tracking_events enable row level security;

-- Visitante anônimo registra os próprios eventos (mesmo padrão de payments/leads)
drop policy if exists "tracking_insert_anon" on public.tracking_events;
create policy "tracking_insert_anon" on public.tracking_events
  for insert to anon, authenticated with check (true);

-- Leitura/exclusão apenas do painel autenticado
drop policy if exists "tracking_admin_read" on public.tracking_events;
create policy "tracking_admin_read" on public.tracking_events
  for select to authenticated using (true);

drop policy if exists "tracking_admin_delete" on public.tracking_events;
create policy "tracking_admin_delete" on public.tracking_events
  for delete to authenticated using (true);
