begin;

create table public.style_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fragrance', 'wardrobe')),
  item_id text not null check (item_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  details jsonb not null check (
    jsonb_typeof(details) = 'object'
    and coalesce(jsonb_typeof(details->'name') = 'string', false)
    and length(trim(details->>'name')) between 1 and 200
    and octet_length(details::text) <= 16384
  ),
  primary key (user_id, kind, item_id)
);

alter table public.style_items enable row level security;
revoke all on public.style_items from public, anon, authenticated;
grant select, insert, update, delete on public.style_items to authenticated;

create policy "Users can manage own style items"
  on public.style_items
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
