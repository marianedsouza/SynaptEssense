-- ============================================================
-- SynaptEssence360® — Visibilidade de material por paciente
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Quando um material NÃO está ativo (não é visível para todos),
-- o analista pode liberar o arquivo para pacientes específicos.
-- A coluna visible_to guarda os ids dos pacientes (protocol_leads)
-- que podem ver aquele material.
-- ============================================================

alter table public.materials
  add column if not exists visible_to uuid[] not null default '{}';
