-- Matching people to people: skills that meet the need come first.
--  1. Volunteers: open requests ordered by how many needed skills they have.
--  2. Members: the volunteers whose skills best match one of their requests.

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
      10 * cardinality(array(
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
  -- Skills that meet the need come first, then the other signals, then newest.
  order by cardinality(array(
      select lower(s) from unnest(h.needed_skills) s
      intersect
      select lower(t) from unnest(me.skills) t
    )) desc,
    match_score desc,
    h.created_at desc;
$$;


-- For the person who posted a request: the volunteers whose skills match it best.
-- Shows only name, picture, profession and the matching skills.
create or replace function public.matching_volunteers(target_request_id uuid)
returns table (
  volunteer_id uuid,
  display_name text,
  avatar_url text,
  profession text,
  matched_skills text[],
  score integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.help_requests h
    where h.id = target_request_id and h.requester_id = (select auth.uid())
  ) then
    raise exception 'Only the person who posted this request can see matching volunteers';
  end if;

  return query
  with need as (
    select h.needed_skills, h.help_type, h.preferred_language, h.neighborhood, h.requester_id
    from public.help_requests h
    where h.id = target_request_id
  ),
  scored as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      v.profession,
      array(
        select lower(s) from unnest(need.needed_skills) s
        intersect
        select lower(t) from unnest(coalesce(v.skills, '{}')) t
      ) as matched,
      case when need.help_type = any(coalesce(v.help_types, '{}')) then 2 else 0 end
      + case when need.preferred_language is not null
               and need.preferred_language = any(p.languages) then 2 else 0 end
      + case when p.neighborhood is not null
               and lower(p.neighborhood) = lower(need.neighborhood) then 2 else 0 end
        as extra
    from need
    join public.profiles p
      on p.role in ('volunteer', 'both') and p.id <> need.requester_id
    left join public.volunteer_details v on v.user_id = p.id
    where not exists (
      select 1 from public.blocks b
      where (b.blocker_id = need.requester_id and b.blocked_user_id = p.id)
         or (b.blocker_id = p.id and b.blocked_user_id = need.requester_id)
    )
  )
  select
    scored.id,
    scored.display_name,
    scored.avatar_url,
    scored.profession,
    scored.matched,
    (10 * cardinality(scored.matched) + scored.extra)::integer
  from scored
  where cardinality(scored.matched) > 0
  order by cardinality(scored.matched) desc, scored.extra desc, scored.display_name
  limit 5;
end;
$$;

revoke all on function public.matching_volunteers(uuid) from public, anon;
grant execute on function public.matching_volunteers(uuid) to authenticated;
grant execute on function public.get_ranked_open_requests() to authenticated;
