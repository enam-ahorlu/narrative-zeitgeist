begin;

alter table public.entries alter column rating drop not null;
CREATE OR REPLACE FUNCTION public.compute_fingerprint(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog AS $$
DECLARE
  v_result           jsonb;
  v_total_entries    int;
  v_overall_avg      numeric(4,2);
  v_primary_themes   jsonb;
  v_format_breakdown jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Fingerprint access denied' USING ERRCODE = '42501';
  END IF;

  -- Ensure the profile row exists (graceful upsert instead of hard exception)
  INSERT INTO public.profiles (id, display_name)
  SELECT
    u.id,
    coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Total entries & overall average rating
  SELECT count(*), round(avg(rating), 2)
  INTO v_total_entries, v_overall_avg
  FROM public.entries
  WHERE user_id = p_user_id;

  -- Primary themes: every tag ranked by weighted score
  WITH tag_stats AS (
    SELECT
      t.name                              AS tag,
      count(et.entry_id)                  AS frequency,
      round(avg(e.rating), 2)             AS avg_rating
    FROM public.entry_tags et
    JOIN public.entries e ON e.id = et.entry_id
    JOIN public.tags    t ON t.id = et.tag_id AND t.user_id = p_user_id
    WHERE e.user_id = p_user_id AND e.rating IS NOT NULL
    GROUP BY t.name
  ),
  max_freq AS (
    SELECT GREATEST(max(frequency)::numeric, 1) AS mf FROM tag_stats
  ),
  weighted AS (
    SELECT
      tag,
      frequency,
      avg_rating,
      round(avg_rating * (frequency / mf), 4) AS weight
    FROM tag_stats, max_freq
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'tag',        tag,
      'avg_rating', avg_rating,
      'frequency',  frequency,
      'weight',     weight
    )
    ORDER BY weight DESC
  )
  INTO v_primary_themes
  FROM weighted;

  -- Format breakdown
  SELECT jsonb_object_agg(
    format::text,
    jsonb_build_object(
      'count',      cnt,
      'avg_rating', round(avg_r, 2)
    )
  )
  INTO v_format_breakdown
  FROM (
    SELECT format, count(*) AS cnt, avg(rating) AS avg_r
    FROM public.entries
    WHERE user_id = p_user_id
    GROUP BY format
  ) sub;

  -- Assemble result
  v_result := jsonb_build_object(
    'primary_themes',    coalesce(v_primary_themes,  '[]'::jsonb),
    'format_breakdown',  coalesce(v_format_breakdown, '{}'::jsonb),
    'overall_avg_rating', v_overall_avg,
    'total_entries',     coalesce(v_total_entries, 0),
    'last_updated',      to_char(now(), 'YYYY-MM-DD')
  );

  -- Upsert into the cache table
  INSERT INTO public.user_fingerprints (user_id, fingerprint_json, last_updated)
  VALUES (p_user_id, v_result, now())
  ON CONFLICT (user_id) DO UPDATE
    SET fingerprint_json = excluded.fingerprint_json,
        last_updated     = excluded.last_updated;

  RETURN v_result;
END;
$$;

alter table public.watchlist add column poster_url text;

create function public.save_watchlist_media(
  p_title text, p_format public.entry_format, p_external_id text, p_reasons jsonb,
  p_cover_color text, p_tags text[], p_catalogue jsonb, p_poster_url text
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare saved_id uuid;
begin
  saved_id := public.save_watchlist_media(p_title,p_format,p_external_id,p_reasons,p_cover_color,p_tags,p_catalogue);
  if p_poster_url ~ '^https://' and length(p_poster_url) <= 4096 then
    update public.watchlist set poster_url = p_poster_url
      where user_id = auth.uid() and id = saved_id and poster_url is distinct from p_poster_url;
  end if;
  return saved_id;
end;
$$;
revoke all on function public.save_watchlist_media(text,public.entry_format,text,jsonb,text,text[],jsonb,text) from public, anon;
grant execute on function public.save_watchlist_media(text,public.entry_format,text,jsonb,text,text[],jsonb,text) to authenticated;

-- The reservation holds the account row lock until its window is read.
create function public.reserve_discovery_slot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare retry integer; started timestamptz;
begin
  retry := public.reserve_discovery_request();
  if retry = 0 then
    select window_started_at into strict started from nz_private.discovery_quota where user_id = auth.uid();
  end if;
  return jsonb_build_object('retry_after',retry,'window',started);
end;
$$;
revoke all on function public.reserve_discovery_slot() from public, anon;
grant execute on function public.reserve_discovery_slot() to authenticated;

-- Older servers cannot establish the original window. Fail closed for those calls.
revoke execute on function public.refund_discovery_request(uuid,integer) from service_role;
create function public.refund_discovery_slot(p_user_id uuid,p_window timestamptz) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
declare used integer;
begin
  select request_count into used from nz_private.discovery_quota
    where user_id=p_user_id and window_started_at=p_window for update;
  if used is null then return false; end if;
  if used = 1 then
    delete from nz_private.discovery_quota where user_id=p_user_id;
  else
    update nz_private.discovery_quota set request_count=used-1 where user_id=p_user_id;
  end if;
  return true;
end;
$$;
revoke all on function public.refund_discovery_slot(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.refund_discovery_slot(uuid,timestamptz) to service_role;

create table nz_private.catalogue_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (endpoint in ('search','ratings')),
  started_at timestamptz not null,
  used integer not null,
  primary key(user_id,endpoint)
);
alter table nz_private.catalogue_quota enable row level security;
revoke all on nz_private.catalogue_quota from public, anon, authenticated;

create function public.reserve_catalogue_request(p_endpoint text) returns integer
language plpgsql security definer set search_path = pg_catalog as $$
declare
  caller uuid := auth.uid();
  stamp timestamptz := statement_timestamp();
  cutoff timestamptz := stamp - interval '1 minute';
  cap integer := case p_endpoint when 'search' then 60 when 'ratings' then 30 end;
begin
  if caller is null or cap is null then raise exception 'Invalid reservation' using errcode='22023'; end if;
  insert into nz_private.catalogue_quota as q values(caller,p_endpoint,stamp,1)
  on conflict(user_id,endpoint) do update
    set used=case when q.started_at <= cutoff then 1 else q.used+1 end,
        started_at=case when q.started_at <= cutoff then stamp else q.started_at end
    where q.started_at <= cutoff or q.used < cap;
  if found then return 0; end if;
  return (select greatest(1,ceil(extract(epoch from started_at + interval '1 minute' - stamp))::integer)
    from nz_private.catalogue_quota where user_id=caller and endpoint=p_endpoint);
end;
$$;
revoke all on function public.reserve_catalogue_request(text) from public, anon;
grant execute on function public.reserve_catalogue_request(text) to authenticated;
commit;
