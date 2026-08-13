-- ============================================================
-- SynaptEssence360® — Excluir participante + retomar por e-mail
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- Busca o participante pelo e-mail (para retomar de onde parou).
-- Retorna o registro mais recente. Só quem sabe o e-mail encontra.
create or replace function public.get_participant_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.participants;
begin
  select * into result
  from public.participants
  where email is not null and lower(email) = lower(p_email)
  order by created_at desc
  limit 1;
  if not found then
    return null;
  end if;
  return to_jsonb(result);
end;
$$;

-- Exclui um participante (as notas do analista são apagadas em cascata).
create or replace function public.delete_participant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.participants where id = p_id;
end;
$$;

-- Por padrão o Postgres libera execução para PUBLIC; removemos para garantir
-- que apenas quem tiver a role autorizada chame cada função.
revoke execute on function public.get_participant_by_email(text) from public;
revoke execute on function public.delete_participant(uuid) from public;

grant execute on function public.get_participant_by_email(text) to anon, authenticated;
grant execute on function public.delete_participant(uuid) to authenticated;
