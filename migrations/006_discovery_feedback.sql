begin;

create table public.discovery_feedback (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  format public.entry_format not null,
  title text not null check (length(trim(title)) between 1 and 300),
  primary key (user_id, format, title)
);

alter table public.discovery_feedback enable row level security;
revoke all on public.discovery_feedback from public, anon, authenticated;
grant select, insert, delete on public.discovery_feedback to authenticated;

create policy "Users can manage their own dismissed recommendations"
  on public.discovery_feedback for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
