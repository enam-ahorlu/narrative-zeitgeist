begin;

create table public.discovery_comparisons (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null,
  created_at timestamptz not null default now(),
  preference text check (preference in ('A','B','tie')),
  sets jsonb not null check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) = 2 and octet_length(sets::text) <= 32768),
  primary key (user_id,id)
);
alter table public.discovery_comparisons enable row level security;
revoke all on public.discovery_comparisons from public, anon, authenticated;
grant select, insert on public.discovery_comparisons to authenticated;
create policy own_comparisons on public.discovery_comparisons for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index on public.discovery_comparisons(user_id,created_at desc);

commit;
