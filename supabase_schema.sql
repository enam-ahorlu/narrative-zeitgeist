-- ============================================================
-- Narrative & Zeitgeist — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- Project: narrative-zeitgeist
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. PROFILES
-- Mirrors auth.users — one row per signed-up user.
-- Supabase Auth manages the actual login; this table stores
-- app-level preferences and display info.
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  varchar(100),
  preferences   jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. ENTRIES
-- A show, book, sports match, or music album the user has
-- watched/read/experienced and wants to log.
-- ============================================================
create type public.entry_format as enum ('show', 'book', 'sports_match', 'music');

create table if not exists public.entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           varchar(300) not null,
  format          public.entry_format not null,
  rating          numeric(3,1) not null check (rating >= 0 and rating <= 10),
  cover_color     varchar(100),                         -- CSS gradient string for thumbnail
  date_completed  date,                                  -- when the user finished it
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Indexes for the most common query patterns
create index if not exists entries_user_id_idx       on public.entries(user_id);
create index if not exists entries_format_idx        on public.entries(user_id, format);
create index if not exists entries_rating_idx        on public.entries(user_id, rating desc);
create index if not exists entries_date_added_idx    on public.entries(user_id, created_at desc);
create index if not exists entries_date_completed_idx on public.entries(user_id, date_completed desc);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_updated_at
  before update on public.entries
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 3. TAGS
-- User-owned labels. Each user has their own tag namespace;
-- the same word can exist for multiple users independently.
-- ============================================================
create table if not exists public.tags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        varchar(80) not null,
  created_at  timestamptz default now(),

  -- Prevent duplicate tag names per user
  unique (user_id, name)
);

create index if not exists tags_user_id_idx on public.tags(user_id);


-- ============================================================
-- 4. ENTRY_TAGS  (junction)
-- Many-to-many: one entry can have many tags, one tag can
-- appear on many entries.
-- ============================================================
create table if not exists public.entry_tags (
  entry_id  uuid not null references public.entries(id) on delete cascade,
  tag_id    uuid not null references public.tags(id)    on delete cascade,
  primary key (entry_id, tag_id)
);

create index if not exists entry_tags_tag_id_idx   on public.entry_tags(tag_id);
create index if not exists entry_tags_entry_id_idx on public.entry_tags(entry_id);


-- ============================================================
-- 5. USER_FINGERPRINTS
-- Cached taste profile. Computed on demand (or via a
-- background job) and stored as JSONB for fast reads.
-- Shape mirrors the brief's taste DNA object.
-- ============================================================
create table if not exists public.user_fingerprints (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  fingerprint_json jsonb not null default '{}'::jsonb,
  last_updated     timestamptz default now()
);


-- ============================================================
-- 6. WATCHLIST
-- Items the user has saved from Discover but hasn't logged
-- to their collection yet.
-- ============================================================
create type public.watchlist_source as enum ('claude_ai', 'manual', 'imdb', 'tmdb', 'goodreads');
create type public.watchlist_priority as enum ('up_next', 'maybe');

create table if not exists public.watchlist (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  title                varchar(300) not null,
  format               public.entry_format not null,
  external_id          varchar(100),                -- IMDB/TMDB/Goodreads ID (nullable)
  source               public.watchlist_source default 'claude_ai',
  match_score          numeric(5,2),                -- e.g. 96.00  (percentage)
  match_reasons        jsonb default '[]'::jsonb,   -- array of reason strings
  cover_color          varchar(100),
  tags                 text[] default '{}',         -- denormalised for fast display
  priority             public.watchlist_priority default 'maybe',
  added_to_collection  boolean default false,
  saved_at             timestamptz default now()
);

create index if not exists watchlist_user_id_idx on public.watchlist(user_id);
create index if not exists watchlist_priority_idx on public.watchlist(user_id, priority);


-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- Every table is locked down so users can only see and
-- modify their own rows. Never skip this on Supabase.
-- ============================================================

-- profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- entries
alter table public.entries enable row level security;
create policy "Users can view own entries"
  on public.entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries"
  on public.entries for insert with check (auth.uid() = user_id);
create policy "Users can update own entries"
  on public.entries for update using (auth.uid() = user_id);
create policy "Users can delete own entries"
  on public.entries for delete using (auth.uid() = user_id);

-- tags
alter table public.tags enable row level security;
create policy "Users can view own tags"
  on public.tags for select using (auth.uid() = user_id);
create policy "Users can insert own tags"
  on public.tags for insert with check (auth.uid() = user_id);
create policy "Users can delete own tags"
  on public.tags for delete using (auth.uid() = user_id);

-- entry_tags (access is derived from ownership of the entry)
alter table public.entry_tags enable row level security;
create policy "Users can view own entry_tags"
  on public.entry_tags for select
  using (exists (
    select 1 from public.entries e
    where e.id = entry_tags.entry_id and e.user_id = auth.uid()
  ));
create policy "Users can insert own entry_tags"
  on public.entry_tags for insert
  with check (exists (
    select 1 from public.entries e
    where e.id = entry_tags.entry_id and e.user_id = auth.uid()
  ));
create policy "Users can delete own entry_tags"
  on public.entry_tags for delete
  using (exists (
    select 1 from public.entries e
    where e.id = entry_tags.entry_id and e.user_id = auth.uid()
  ));

-- user_fingerprints
alter table public.user_fingerprints enable row level security;
create policy "Users can view own fingerprint"
  on public.user_fingerprints for select using (auth.uid() = user_id);
create policy "Users can upsert own fingerprint"
  on public.user_fingerprints for insert with check (auth.uid() = user_id);
create policy "Users can update own fingerprint"
  on public.user_fingerprints for update using (auth.uid() = user_id);

-- watchlist
alter table public.watchlist enable row level security;
create policy "Users can view own watchlist"
  on public.watchlist for select using (auth.uid() = user_id);
create policy "Users can insert own watchlist"
  on public.watchlist for insert with check (auth.uid() = user_id);
create policy "Users can update own watchlist"
  on public.watchlist for update using (auth.uid() = user_id);
create policy "Users can delete own watchlist"
  on public.watchlist for delete using (auth.uid() = user_id);


-- ============================================================
-- 8. FINGERPRINT CALCULATION FUNCTION
-- Called from the app after adding/editing/deleting an entry.
-- Returns a JSONB object matching the taste DNA shape from
-- the brief. The app upserts this into user_fingerprints.
-- ============================================================
create or replace function public.compute_fingerprint(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_result           jsonb;
  v_total_entries    int;
  v_overall_avg      numeric(4,2);
  v_primary_themes   jsonb;
  v_genre_breakdown  jsonb;
  v_format_breakdown jsonb;
begin
  -- Guard: user must exist
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  -- Total entries & overall average rating
  select count(*), round(avg(rating), 2)
  into v_total_entries, v_overall_avg
  from public.entries
  where user_id = p_user_id;

  -- Primary themes: every tag ranked by weighted score
  -- weight = avg_rating × (frequency / max_frequency_across_tags)
  with tag_stats as (
    select
      t.name                              as tag,
      count(et.entry_id)                  as frequency,
      round(avg(e.rating), 2)             as avg_rating
    from public.entry_tags et
    join public.entries e on e.id = et.entry_id
    join public.tags    t on t.id = et.tag_id
    where e.user_id = p_user_id
    group by t.name
  ),
  max_freq as (
    select max(frequency)::numeric as mf from tag_stats
  ),
  weighted as (
    select
      tag,
      frequency,
      avg_rating,
      round(avg_rating * (frequency / mf), 4) as weight
    from tag_stats, max_freq
  )
  select jsonb_agg(
    jsonb_build_object(
      'tag',        tag,
      'avg_rating', avg_rating,
      'frequency',  frequency,
      'weight',     weight
    )
    order by weight desc
  )
  into v_primary_themes
  from weighted;

  -- Format breakdown
  select jsonb_object_agg(
    format::text,
    jsonb_build_object(
      'count',      count(*),
      'avg_rating', round(avg(rating), 2)
    )
  )
  into v_format_breakdown
  from public.entries
  where user_id = p_user_id
  group by format;

  -- Build final result
  v_result := jsonb_build_object(
    'primary_themes',    coalesce(v_primary_themes,  '[]'::jsonb),
    'format_breakdown',  coalesce(v_format_breakdown,'{}' ::jsonb),
    'overall_avg_rating',coalesce(v_overall_avg, 0),
    'total_entries',     v_total_entries,
    'last_updated',      to_char(now(), 'YYYY-MM-DD')
  );

  -- Upsert into the cache table
  insert into public.user_fingerprints (user_id, fingerprint_json, last_updated)
  values (p_user_id, v_result, now())
  on conflict (user_id) do update
    set fingerprint_json = excluded.fingerprint_json,
        last_updated     = excluded.last_updated;

  return v_result;
end;
$$;


-- ============================================================
-- 9. HELPER VIEW  — entries_with_tags
-- Joins entries + their tags into a single flat row per entry
-- so the frontend can query everything in one round-trip.
-- ============================================================
create or replace view public.entries_with_tags as
select
  e.id,
  e.user_id,
  e.title,
  e.format,
  e.rating,
  e.cover_color,
  e.date_completed,
  e.notes,
  e.created_at,
  e.updated_at,
  coalesce(
    array_agg(t.name order by t.name) filter (where t.name is not null),
    '{}'::text[]
  ) as tags
from public.entries e
left join public.entry_tags et on et.entry_id = e.id
left join public.tags        t  on t.id = et.tag_id
group by e.id;

-- RLS on the view is inherited from the underlying tables,
-- but we explicitly grant select to authenticated users.
grant select on public.entries_with_tags to authenticated;


-- ============================================================
-- DONE.
-- All tables, indexes, RLS policies, the fingerprint function,
-- and the entries_with_tags view are ready.
-- ============================================================
