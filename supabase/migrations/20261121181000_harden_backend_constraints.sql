-- Grant the client schema access explicitly, preserve moderation targets after deletion,
-- and guard against two simultaneous acceptances of one request.
grant usage on schema public to authenticated;

alter table public.reports
  drop constraint if exists reports_reported_user_id_fkey;
alter table public.reports
  drop constraint if exists reports_help_request_id_fkey;

create unique index matches_one_accepted_per_request_idx
  on public.matches (help_request_id)
  where status in ('accepted', 'completed');
