begin;

-- Return Discovery quota when the model provider failed and nothing was spent.
-- Only the server may call this, through the service role. Granting it to signed-in
-- users would let anyone reset their own limit through the public API.
create function public.refund_discovery_request(p_user_id uuid, p_count integer default 1)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  refund integer := least(greatest(coalesce(p_count, 1), 1), 2);
  current_window timestamptz := statement_timestamp() - interval '1 hour';
begin
  if p_user_id is null then
    raise exception 'User required' using errcode = '22023';
  end if;

  update nz_private.discovery_quota as quota
  set request_count = quota.request_count - refund
  where quota.user_id = p_user_id
    and quota.window_started_at > current_window
    and quota.request_count > refund;

  if not found then
    delete from nz_private.discovery_quota as quota
    where quota.user_id = p_user_id
      and quota.window_started_at > current_window
      and quota.request_count <= refund;
  end if;
end;
$$;

revoke all on function public.refund_discovery_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.refund_discovery_request(uuid, integer) to service_role;

-- Fix the mutable search_path flagged by the Supabase security advisor.
alter function public.set_updated_at() set search_path = pg_catalog;

commit;
