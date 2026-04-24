-- ============================================================
-- N&Z Migration Fix — run this ONCE in Supabase SQL Editor
-- Safe to run: all statements are additive / idempotent
-- ============================================================

-- 1. Add 'film' to the entry_format enum (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'film'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'entry_format')
  ) THEN
    ALTER TYPE public.entry_format ADD VALUE 'film';
  END IF;
END$$;

-- 2. Ensure every existing auth user has a profiles row
-- (covers users who signed up before the trigger was created)
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 3. Replace compute_fingerprint with a version that gracefully handles
--    missing profiles rows (upserts the profile instead of throwing)
CREATE OR REPLACE FUNCTION public.compute_fingerprint(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result           jsonb;
  v_total_entries    int;
  v_overall_avg      numeric(4,2);
  v_primary_themes   jsonb;
  v_format_breakdown jsonb;
BEGIN
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
    JOIN public.tags    t ON t.id = et.tag_id
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

-- 4. Run compute_fingerprint immediately for all existing users
-- so their fingerprints are populated right away
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN SELECT id FROM auth.users LOOP
    BEGIN
      PERFORM public.compute_fingerprint(uid);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped user %: %', uid, SQLERRM;
    END;
  END LOOP;
END$$;
