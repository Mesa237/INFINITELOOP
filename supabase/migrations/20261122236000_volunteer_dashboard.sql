-- Volunteer dashboard: what kinds of help a volunteer is willing to give,
-- plus talents, and matching that uses them.

alter table public.volunteer_details
  add column if not exists help_types text[] not null default '{}'
    check (
      help_types <@ array[
        'appointments', 'paperwork', 'transportation', 'companionship',
        'language_practice', 'technology', 'other'
      ]::text[]
    ),
  add column if not exists talents text
    check (talents is null or char_length(btrim(talents)) <= 300);

-- Open requests ranked for the signed-in volunteer:
--   +3 per matching skill, +2 if they want to help with this kind of request,
--   +2 for a shared language, +2 for the same neighbourhood.
-- Runs with the caller's permissions, so existing RLS still applies.
create or replace function public.get_ranked_open_requests()
returns table (
  id uuid,
  requester_id uuid,
  title text,
  description text,
  help_type text,
  needed_skills text[],
  preferred_language text,
  neighborhood text,
  created_at timestamptz,
  match_score integer,
  matched_skills text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select
      p.id,
      p.languages,
      p.neighborhood,
      coalesce(v.skills, '{}') as skills,
      coalesce(v.help_types, '{}') as help_types
    from public.profiles p
    left join public.volunteer_details v on v.user_id = p.id
    where p.id = (select auth.uid())
  )
  select
    h.id,
    h.requester_id,
    h.title,
    h.description,
    h.help_type,
    h.needed_skills,
    h.preferred_language,
    h.neighborhood,
    h.created_at,
    (
      3 * cardinality(array(
        select lower(s) from unnest(h.needed_skills) s
        intersect
        select lower(t) from unnest(me.skills) t
      ))
      + case when h.help_type = any(me.help_types) then 2 else 0 end
      + case when h.preferred_language is not null
               and h.preferred_language = any(me.languages) then 2 else 0 end
      + case when me.neighborhood is not null
               and lower(h.neighborhood) = lower(me.neighborhood) then 2 else 0 end
    )::integer as match_score,
    array(
      select lower(s) from unnest(h.needed_skills) s
      intersect
      select lower(t) from unnest(me.skills) t
    ) as matched_skills
  from public.help_requests h
  cross join me
  where h.status = 'open'
    and h.requester_id <> me.id
    and not public.is_blocked_with(h.requester_id)
    and not exists (
      select 1 from public.request_skips k
      where k.user_id = me.id and k.help_request_id = h.id
    )
  order by match_score desc, h.created_at desc;
$$;

grant select, insert, update on table public.volunteer_details to authenticated;
grant execute on function public.get_ranked_open_requests() to authenticated;
