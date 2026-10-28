-- Argila: persistência inicial compatível com o backup JSON existente.
-- Cada conta tem um espaço privado. A colaboração entre membros de um ateliê
-- pode ser adicionada depois sem alterar o formato JSON do app.

create table if not exists public.argila_workspace_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"produtos":[],"vendas":[],"clientes":[],"materiais":[],"producao":[],"transacoes":[],"config":{}}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint argila_workspace_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.argila_workspace_data enable row level security;

drop policy if exists "Users can read their Argila workspace" on public.argila_workspace_data;
create policy "Users can read their Argila workspace"
  on public.argila_workspace_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.argila_workspace_data from anon, authenticated;
grant select on table public.argila_workspace_data to authenticated;

create or replace function public.save_argila_workspace(
  p_payload jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Workspace payload must be a JSON object' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.argila_workspace_data (user_id, payload, revision, updated_at)
    values (v_user_id, p_payload, 1, now())
    on conflict (user_id) do nothing
    returning revision into v_revision;

    if v_revision is not null then
      return v_revision;
    end if;
  end if;

  update public.argila_workspace_data
  set payload = p_payload,
      revision = revision + 1,
      updated_at = now()
  where user_id = v_user_id
    and revision = p_expected_revision
  returning revision into v_revision;

  if v_revision is null then
    raise exception 'ARGILA_CONFLICT' using errcode = '40001';
  end if;

  return v_revision;
end;
$$;

revoke all on function public.save_argila_workspace(jsonb, bigint) from public, anon;
grant execute on function public.save_argila_workspace(jsonb, bigint) to authenticated;
