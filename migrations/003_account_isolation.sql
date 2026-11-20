begin;

-- Declare the privileges required by the app, including the invoker view's
-- base tables, without depending on a project's default API grants.
revoke all on public.profiles, public.entries, public.tags, public.entry_tags,
  public.user_fingerprints, public.watchlist from public, anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.entries, public.watchlist to authenticated;
grant select, insert, delete on public.tags, public.entry_tags to authenticated;
grant select on public.user_fingerprints to authenticated;

alter view public.entries_with_tags set (security_invoker = true);
revoke all on public.entries_with_tags from public, anon;
grant select on public.entries_with_tags to authenticated;

alter function public.handle_new_user() set search_path = pg_catalog;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy "Users can insert own entry_tags" on public.entry_tags;
create policy "Users can insert own entry_tags"
  on public.entry_tags for insert to authenticated
  with check (
    exists (select 1 from public.entries e
      where e.id = entry_id and e.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t
      where t.id = tag_id and t.user_id = (select auth.uid()))
  );

create schema if not exists nz_private;
revoke all on schema nz_private from public, anon, authenticated;

-- Preserve the fingerprint's cached JSON format and the older-profile repair.
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
    WHERE e.user_id = p_user_id
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
    'overall_avg_rating', coalesce(v_overall_avg, 0),
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

revoke all on function public.compute_fingerprint(uuid) from public, anon;
grant execute on function public.compute_fingerprint(uuid) to authenticated;

-- Discard derived caches that may contain a tag linked by the older policy.
delete from public.user_fingerprints as f
where exists (
  select 1 from public.entry_tags et
  join public.entries e on e.id = et.entry_id
  join public.tags t on t.id = et.tag_id
  where e.user_id = f.user_id and t.user_id <> e.user_id
);

commit;
