begin;

-- A dismissal now records why. 'not_for_me' means the person does not want things like this;
-- 'discarded' only hides this one suggestion (for example a film of a book already in the collection)
-- and says nothing about taste. Existing rows keep the default.
alter table public.discovery_feedback
  add column reason text not null default 'not_for_me' check (reason in ('not_for_me','discarded'));
alter table public.discovery_catalogue_feedback
  add column reason text not null default 'not_for_me' check (reason in ('not_for_me','discarded'));

commit;
