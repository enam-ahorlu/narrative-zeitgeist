begin;

create table nz_private.discovery_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 12)
);
alter table nz_private.discovery_quota enable row level security;
revoke all on nz_private.discovery_quota from public, anon, authenticated;

-- One row per account. PostgreSQL locks the conflicting row, so concurrent
-- requests share the same quota even when served by different functions.
create function public.reserve_discovery_request()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller uuid := auth.uid();
  requested_at timestamptz := statement_timestamp();
  used_count integer;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into nz_private.discovery_quota as quota (user_id, window_started_at, request_count)
    values (caller, requested_at, 1)
  on conflict (user_id) do update
    set request_count = case
          when quota.window_started_at <= requested_at - interval '1 hour' then 1
          else quota.request_count + 1
        end,
        window_started_at = case
          when quota.window_started_at <= requested_at - interval '1 hour' then requested_at
          else quota.window_started_at
        end
    where quota.window_started_at <= requested_at - interval '1 hour'
       or quota.request_count < 12
  returning request_count into used_count;

  if used_count is not null then
    return 0;
  end if;
  return (select least(3600, greatest(1, ceil(extract(epoch from
    (window_started_at + interval '1 hour' - clock_timestamp())))::integer))
    from nz_private.discovery_quota where user_id = caller);
end;
$$;

revoke all on function public.reserve_discovery_request() from public, anon;
grant execute on function public.reserve_discovery_request() to authenticated;

commit;
