-- ============================================================
-- Narrative & Zeitgeist — Migration 001
-- Adds poster_url column to entries + updates entries_with_tags
-- Run this in the Supabase SQL Editor (safe to re-run).
-- ============================================================


-- 1. Add poster_url to entries
--    Stores the URL returned by /api/search (TMDB, Google Books, iTunes, etc.)
--    so the thumbnail survives page reloads.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS poster_url text;


-- 2. Recreate entries_with_tags view to expose poster_url
--    (DROP + CREATE because Postgres doesn't support ALTER VIEW column adds)
DROP VIEW IF EXISTS public.entries_with_tags;

CREATE OR REPLACE VIEW public.entries_with_tags AS
SELECT
  e.id,
  e.user_id,
  e.title,
  e.format,
  e.rating,
  e.cover_color,
  e.poster_url,
  e.date_completed,
  e.notes,
  e.created_at,
  e.updated_at,
  COALESCE(
    ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
    '{}'::text[]
  ) AS tags
FROM public.entries e
LEFT JOIN public.entry_tags et ON et.entry_id = e.id
LEFT JOIN public.tags        t  ON t.id = et.tag_id
GROUP BY e.id;

-- Re-grant select to authenticated users (lost on DROP)
GRANT SELECT ON public.entries_with_tags TO authenticated;


-- ============================================================
-- DONE. entries now persists poster_url from content search.
-- ============================================================
