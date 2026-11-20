begin;

-- These invoker commands use the existing table grants and row policies.
create function public.save_journal_entry(
  p_entry_id uuid, p_edit boolean, p_title text, p_format public.entry_format,
  p_rating numeric, p_notes text, p_cover_color text, p_date_completed date,
  p_poster_url text, p_tags text[], p_watchlist_id uuid
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  archived boolean;
  saved_id uuid;
  tag_names text[];
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_entry_id is null or p_title is null or trim(p_title) = '' or p_edit is null
    or (p_edit and p_watchlist_id is not null) then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('journal:' || owner_id::text, 0));

  if p_watchlist_id is not null then
    select coalesce(w.added_to_collection, false) into archived
    from public.watchlist w where w.id = p_watchlist_id and w.user_id = owner_id for update;
    if not found then
      raise exception 'Watchlist item is no longer available' using errcode = 'P0002';
    end if;
    if archived then
      if exists (select from public.entries where id = p_entry_id and user_id = owner_id) then
        return p_entry_id;
      end if;
      raise exception 'This Watchlist item was already moved' using errcode = 'P0002';
    end if;
  end if;

  if p_edit then
    update public.entries set title = trim(p_title), format = p_format, rating = p_rating,
      notes = p_notes, cover_color = p_cover_color, date_completed = p_date_completed,
      poster_url = p_poster_url
    where id = p_entry_id and user_id = owner_id returning id into saved_id;
    if not found then
      raise exception 'Entry is no longer available' using errcode = 'P0002';
    end if;
  else
    insert into public.entries (id, user_id, title, format, rating, notes, cover_color, date_completed, poster_url)
    values (p_entry_id, owner_id, trim(p_title), p_format, p_rating, p_notes, p_cover_color, p_date_completed, p_poster_url)
    on conflict (id) do nothing returning id into saved_id;
    if saved_id is null then
      if p_watchlist_id is null and exists (select from public.entries where id = p_entry_id and user_id = owner_id) then
        return p_entry_id;
      end if;
      raise exception 'Entry could not be created' using errcode = '22023';
    end if;
  end if;

  select array_agg(name order by name) into tag_names
  from (select distinct lower(trim(tag)) as name from unnest(p_tags) as input(tag) where trim(tag) <> '') names;
  insert into public.tags (user_id, name)
  select owner_id, name from unnest(tag_names) as input(name)
  on conflict (user_id, name) do nothing;

  delete from public.entry_tags where entry_id = saved_id;
  insert into public.entry_tags (entry_id, tag_id)
  select saved_id, t.id from public.tags t
  where t.user_id = owner_id and t.name = any(tag_names);

  if p_watchlist_id is not null then
    update public.watchlist set added_to_collection = true
    where id = p_watchlist_id and user_id = owner_id;
  end if;
  return saved_id;
end;
$$;

create function public.merge_journal_tags(p_from text, p_to text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  from_id uuid;
  to_id uuid;
  from_name text := lower(trim(p_from));
  to_name text := lower(trim(p_to));
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if from_name is null or to_name is null or from_name = to_name
    or length(from_name) not between 1 and 80 or length(to_name) not between 1 and 80 then
    raise exception 'Choose two different tag names' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('journal:' || owner_id::text, 0));
  select t.id into from_id from public.tags t where t.user_id = owner_id and t.name = from_name;
  if not found then
    raise exception 'Source tag no longer exists' using errcode = 'P0002';
  end if;
  insert into public.tags (user_id, name) values (owner_id, to_name)
  on conflict (user_id, name) do nothing;
  select t.id into to_id from public.tags t where t.user_id = owner_id and t.name = to_name;
  insert into public.entry_tags (entry_id, tag_id)
  select et.entry_id, to_id from public.entry_tags et
  where et.tag_id = from_id
  on conflict (entry_id, tag_id) do nothing;
  delete from public.tags where id = from_id and user_id = owner_id;
end;
$$;

create function public.save_watchlist_pick(
  p_title text, p_format public.entry_format, p_external_id text,
  p_reasons jsonb, p_cover_color text, p_tags text[]
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  item_title text := trim(p_title);
  saved_id uuid;
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if item_title is null or length(item_title) not between 1 and 300 or p_format is null then
    raise exception 'Invalid Watchlist item' using errcode = '22023';
  end if;
  -- Serialize only saves for the same account, format and normalized title.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':' || p_format::text || ':' || lower(item_title), 0));
  select w.id into saved_id from public.watchlist w
  where w.user_id = owner_id and w.format = p_format and lower(trim(w.title)) = lower(item_title)
    and w.added_to_collection = false
  order by w.saved_at, w.id limit 1;
  if saved_id is not null then
    return saved_id;
  end if;
  insert into public.watchlist (user_id, title, format, external_id, match_reasons, cover_color, tags)
  values (owner_id, item_title, p_format, p_external_id, p_reasons, p_cover_color, p_tags)
  returning id into saved_id;
  return saved_id;
end;
$$;

create function public.dismiss_watchlist_pick(p_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  pick public.watchlist%rowtype;
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  delete from public.watchlist where id = p_id and user_id = owner_id and added_to_collection = false
  returning * into pick;
  if not found then
    raise exception 'Watchlist item is no longer available' using errcode = 'P0002';
  end if;
  insert into public.discovery_feedback (user_id, format, title)
  values (owner_id, pick.format, pick.title) on conflict do nothing;
end;
$$;

revoke all on function
  public.save_journal_entry(uuid, boolean, text, public.entry_format, numeric, text, text, date, text, text[], uuid),
  public.merge_journal_tags(text, text),
  public.save_watchlist_pick(text, public.entry_format, text, jsonb, text, text[]),
  public.dismiss_watchlist_pick(uuid)
from public, anon;
grant execute on function
  public.save_journal_entry(uuid, boolean, text, public.entry_format, numeric, text, text, date, text, text[], uuid),
  public.merge_journal_tags(text, text),
  public.save_watchlist_pick(text, public.entry_format, text, jsonb, text, text[]),
  public.dismiss_watchlist_pick(uuid)
to authenticated;

commit;
