begin;

alter table public.entries add column catalogue jsonb
  check (jsonb_typeof(catalogue) = 'object' and octet_length(catalogue::text) <= 2048);
alter table public.watchlist add column catalogue jsonb
  check (jsonb_typeof(catalogue) = 'object' and octet_length(catalogue::text) <= 2048);
alter table public.watchlist add column queue_position integer check (queue_position > 0);

create or replace view public.entries_with_tags with (security_invoker = true) as
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
  ) AS tags,
  e.catalogue
FROM public.entries e
LEFT JOIN public.entry_tags et ON et.entry_id = e.id
LEFT JOIN public.tags        t  ON t.id = et.tag_id
GROUP BY e.id;

create table public.discovery_catalogue_feedback (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  format public.entry_format not null,
  provider text not null check (length(provider) between 1 and 40),
  catalogue_id text not null check (length(catalogue_id) between 1 and 200),
  title text not null check (length(trim(title)) between 1 and 300),
  catalogue jsonb not null check (jsonb_typeof(catalogue) = 'object' and octet_length(catalogue::text) <= 2048),
  primary key (user_id, format, provider, catalogue_id)
);
alter table public.discovery_catalogue_feedback enable row level security;
revoke all on public.discovery_catalogue_feedback from public, anon, authenticated;
grant select, insert on public.discovery_catalogue_feedback to authenticated;
create policy "Users can manage their catalogue dismissals" on public.discovery_catalogue_feedback
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.save_journal_media(
  p_entry_id uuid, p_edit boolean, p_title text, p_format public.entry_format,
  p_rating numeric, p_notes text, p_cover_color text, p_date_completed date,
  p_poster_url text, p_tags text[], p_watchlist_id uuid, p_catalogue jsonb
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare
  saved_id uuid;
begin
  saved_id := public.save_journal_entry(p_entry_id,p_edit,p_title,p_format,p_rating,p_notes,
    p_cover_color,p_date_completed,p_poster_url,p_tags,p_watchlist_id);
  update public.entries set catalogue = p_catalogue
  where id = saved_id and user_id = auth.uid() and catalogue is distinct from p_catalogue;
  return saved_id;
end;
$$;

create function public.save_watchlist_media(
  p_title text, p_format public.entry_format, p_external_id text,
  p_reasons jsonb, p_cover_color text, p_tags text[], p_catalogue jsonb
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  saved_id uuid;
  item_title text := trim(p_title);
  provider text := p_catalogue->>'provider';
  item_key text := p_catalogue->>'id';
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if item_title is null or length(item_title) not between 1 and 300 or p_format is null then
    raise exception 'Invalid Watchlist item' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('journal:' || owner_id::text, 0));
  select w.id into saved_id from public.watchlist w
  where w.user_id = owner_id and w.format = p_format and not w.added_to_collection and (
    (provider is not null and item_key is not null and
      (w.external_id = provider || ':' || item_key or
       (w.catalogue->>'provider' = provider and w.catalogue->>'id' = item_key)))
    or (lower(trim(w.title)) = lower(item_title) and
      coalesce(w.catalogue->>'kind','album') = coalesce(p_catalogue->>'kind','album') and
      (provider is null or item_key is null or
        (w.catalogue->>'provider' is null and w.external_id is null) or
        (w.catalogue->>'provider' is distinct from provider and
         lower(w.catalogue->>'creator') = lower(p_catalogue->>'creator') and
         (w.catalogue->>'year' is null or p_catalogue->>'year' is null or w.catalogue->>'year' = p_catalogue->>'year'))))
  ) order by w.saved_at,w.id limit 1;
  if saved_id is null then
    insert into public.watchlist (user_id,title,format,external_id,match_reasons,cover_color,tags,catalogue)
    values (owner_id,item_title,p_format,p_external_id,p_reasons,p_cover_color,p_tags,p_catalogue)
    returning id into saved_id;
  end if;
  return saved_id;
end;
$$;

create function public.dismiss_watchlist_media(p_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare
  pick public.watchlist%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into pick from public.watchlist where id = p_id and user_id = auth.uid() and not added_to_collection for update;
  if not found then raise exception 'Watchlist item is no longer available' using errcode = 'P0002'; end if;
  if pick.catalogue->>'provider' is null or pick.catalogue->>'id' is null then
    perform public.dismiss_watchlist_pick(p_id);
    return;
  end if;
  insert into public.discovery_catalogue_feedback (format,provider,catalogue_id,title,catalogue)
  values (pick.format,pick.catalogue->>'provider',pick.catalogue->>'id',pick.title,pick.catalogue)
  on conflict do nothing;
  delete from public.watchlist where id = p_id and user_id = auth.uid();
end;
$$;

create function public.save_up_next_order(p_ids uuid[])
returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  active_ids uuid[];
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('journal:' || owner_id::text, 0));
  select coalesce(array_agg(id),'{}') into active_ids from (
    select id from public.watchlist where user_id = owner_id and priority = 'up_next' and not added_to_collection
    order by id for update
  ) as queue;
  if p_ids is null or cardinality(active_ids) <> cardinality(p_ids)
    or not (active_ids @> p_ids and p_ids @> active_ids) then
    raise exception 'Up Next changed. Reload the list and try again.' using errcode = 'P0002';
  end if;
  update public.watchlist w set queue_position = position
  from unnest(p_ids) with ordinality as proposed(id,position)
  where w.id = proposed.id and w.user_id = owner_id and w.queue_position is distinct from proposed.position;
end;
$$;

revoke all on function
  public.save_journal_media(uuid,boolean,text,public.entry_format,numeric,text,text,date,text,text[],uuid,jsonb),
  public.save_watchlist_media(text,public.entry_format,text,jsonb,text,text[],jsonb),
  public.dismiss_watchlist_media(uuid), public.save_up_next_order(uuid[]) from public, anon;
grant execute on function
  public.save_journal_media(uuid,boolean,text,public.entry_format,numeric,text,text,date,text,text[],uuid,jsonb),
  public.save_watchlist_media(text,public.entry_format,text,jsonb,text,text[],jsonb),
  public.dismiss_watchlist_media(uuid), public.save_up_next_order(uuid[]) to authenticated;

commit;
