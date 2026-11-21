begin;

-- Fragrance and wardrobe picks that the person dismissed from Discover.
-- reason 'not_for_me' is an explicit dislike; 'discarded' only hides this one pick (for example one already
-- owned in another form) and says nothing about taste. Neither feeds the style ranking.
create table public.style_dismissals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fragrance', 'wardrobe')),
  item_key text not null check (length(trim(item_key)) between 1 and 400),
  reason text not null default 'not_for_me' check (reason in ('not_for_me', 'discarded')),
  primary key (user_id, kind, item_key)
);

alter table public.style_dismissals enable row level security;
revoke all on public.style_dismissals from public, anon, authenticated;
grant select, insert, delete on public.style_dismissals to authenticated;

create policy "Users can manage own style dismissals"
  on public.style_dismissals
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
