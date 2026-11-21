begin;

-- Normalised title used to recognise the same work typed slightly differently.
-- Only ASCII punctuation is stripped so the result does not depend on database locale.
create function public.journal_title_key(p_title text)
returns text language sql immutable set search_path = pg_catalog as $$
  select coalesce(nullif(btrim(regexp_replace(
    replace(replace(replace(lower(coalesce(p_title,'')),'&',' and '),'’',''),'''',''),
    '[\s!"#$%()*+,./:;<=>?@\[\\\]^_`{|}~-]+',' ','g')),''),btrim(lower(coalesce(p_title,''))))
$$;

-- save_journal_media gains p_repeat. A new entry for a work that is already in the
-- collection is refused unless the caller says it is a deliberate repeat (Log again).
drop function public.save_journal_media(uuid,boolean,text,public.entry_format,numeric,text,text,date,text,text[],uuid,jsonb);

create function public.save_journal_media(
  p_entry_id uuid, p_edit boolean, p_title text, p_format public.entry_format,
  p_rating numeric, p_notes text, p_cover_color text, p_date_completed date,
  p_poster_url text, p_tags text[], p_watchlist_id uuid, p_catalogue jsonb,
  p_repeat boolean default false
) returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare
  owner_id uuid := auth.uid();
  saved_id uuid;
  new_key text := public.journal_title_key(p_title);
  new_provider text := nullif(lower(btrim(p_catalogue->>'provider')),'');
  new_id text := nullif(btrim(p_catalogue->>'id'),'');
  new_year text := case when (p_catalogue->>'year') ~ '^\d{4}$' then p_catalogue->>'year' end;
  new_creator text := nullif(public.journal_title_key(p_catalogue->>'creator'),'');
  new_part text := case when p_format = 'music' and p_catalogue->>'kind' = 'track' then 'track'
                        when p_format = 'music' then 'album' else '' end;
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if new_id is null then new_provider := null; end if;

  if not coalesce(p_edit,false) and not coalesce(p_repeat,false) and p_entry_id is not null
     and p_title is not null and trim(p_title) <> '' then
    perform pg_advisory_xact_lock(hashtextextended('journal:' || owner_id::text, 0));
    -- A retry of a save that already succeeded is not a duplicate of itself.
    if not exists (select from public.entries where id = p_entry_id and user_id = owner_id) and exists (
      select from public.entries e
      where e.user_id = owner_id and e.format = p_format
        and case when e.format = 'music' and e.catalogue->>'kind' = 'track' then 'track'
                 when e.format = 'music' then 'album' else '' end = new_part
        and case
          when new_provider is not null and nullif(btrim(e.catalogue->>'id'),'') is not null
               and lower(btrim(e.catalogue->>'provider')) = new_provider
            then btrim(e.catalogue->>'id') = new_id
          else public.journal_title_key(e.title) = new_key
            and not (new_year is not null and (e.catalogue->>'year') ~ '^\d{4}$' and e.catalogue->>'year' <> new_year)
            and not (new_creator is not null and nullif(public.journal_title_key(e.catalogue->>'creator'),'') is not null
                     and public.journal_title_key(e.catalogue->>'creator') <> new_creator)
        end
    ) then
      raise exception 'You already have this in your collection' using errcode = '23505';
    end if;
  end if;

  saved_id := public.save_journal_entry(p_entry_id,p_edit,p_title,p_format,p_rating,p_notes,
    p_cover_color,p_date_completed,p_poster_url,p_tags,p_watchlist_id);
  update public.entries set catalogue = p_catalogue
  where id = saved_id and user_id = auth.uid() and catalogue is distinct from p_catalogue;
  return saved_id;
end;
$$;

revoke all on function public.journal_title_key(text) from public, anon;
grant execute on function public.journal_title_key(text) to authenticated;
revoke all on function
  public.save_journal_media(uuid,boolean,text,public.entry_format,numeric,text,text,date,text,text[],uuid,jsonb,boolean)
  from public, anon;
grant execute on function
  public.save_journal_media(uuid,boolean,text,public.entry_format,numeric,text,text,date,text,text[],uuid,jsonb,boolean)
  to authenticated;

commit;
