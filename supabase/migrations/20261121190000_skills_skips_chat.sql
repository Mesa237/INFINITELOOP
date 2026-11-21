-- CouCouMTL: volunteer skills, skills-ranked feed, skip, and real chat.
-- Adds to the existing schema; does not change existing tables' data.

-- 1. Volunteer details (skills, profession, experience, availability).
--    Private by default: visible to the owner, and to a member only after
--    this volunteer has offered to help on one of that member's requests.
create table public.volunteer_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  skills text[] not null default '{}'
    check (cardinality(skills) <= 15),
  profession text check (profession is null or char_length(btrim(profession)) <= 80),
  experience text check (experience is null or char_length(experience) <= 500),
  availability text check (availability is null or char_length(availability) <= 200),
  updated_at timestamptz not null default now()
);

create trigger volunteer_details_set_updated_at
  before update on public.volunteer_details
  for each row execute function public.set_updated_at();

create function public.can_view_volunteer_details(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      target_user_id = (select auth.uid())
      or exists (
        select 1
        from public.matches m
        join public.help_requests h on h.id = m.help_request_id
        where m.volunteer_id = target_user_id
          and h.requester_id = (select auth.uid())
          and m.status in ('pending', 'accepted', 'completed')
      )
    )
    and not public.is_blocked_with(target_user_id);
$$;

alter table public.volunteer_details enable row level security;

create policy "Owners and offered-to members can view volunteer details"
  on public.volunteer_details for select to authenticated
  using (public.can_view_volunteer_details(user_id));
create policy "Users create their own volunteer details"
  on public.volunteer_details for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users update their own volunteer details"
  on public.volunteer_details for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 2. Skills a request needs (filled by the AI assistant, editable by the member).
alter table public.help_requests
  add column needed_skills text[] not null default '{}'
    check (cardinality(needed_skills) <= 8);

-- 3. Skip: a volunteer hides a request from their own feed.
create table public.request_skips (
  user_id uuid not null references public.profiles (id) on delete cascade,
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, help_request_id)
);

alter table public.request_skips enable row level security;

create policy "Users manage their own skips"
  on public.request_skips for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. Volunteer feed ranked by skills, language and neighbourhood.
--    Runs with the caller's permissions, so existing RLS still applies.
create function public.get_ranked_open_requests()
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
      coalesce(v.skills, '{}') as skills
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

-- 5. Real chat, only between the member and the accepted volunteer.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_match_created_idx on public.messages (match_id, created_at);

create function public.can_chat_in_match(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.help_requests h on h.id = m.help_request_id
    where m.id = target_match_id
      and m.status in ('accepted', 'completed')
      and (select auth.uid()) in (m.volunteer_id, h.requester_id)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.volunteer_id and b.blocked_user_id = h.requester_id)
           or (b.blocker_id = h.requester_id and b.blocked_user_id = m.volunteer_id)
      )
  );
$$;

alter table public.messages enable row level security;

create policy "Accepted match participants can read their chat"
  on public.messages for select to authenticated
  using (public.can_chat_in_match(match_id));
create policy "Accepted match participants can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.can_chat_in_match(match_id)
  );

-- Live updates for the chat screen.
alter publication supabase_realtime add table public.messages;

-- 6. Permissions.
revoke all on table public.volunteer_details, public.request_skips, public.messages from anon;
grant select, insert, update on table public.volunteer_details to authenticated;
grant select, insert, delete on table public.request_skips to authenticated;
grant select, insert on table public.messages to authenticated;

revoke all on function public.can_view_volunteer_details(uuid) from public, anon;
revoke all on function public.get_ranked_open_requests() from public, anon;
revoke all on function public.can_chat_in_match(uuid) from public, anon;
grant execute on function public.can_view_volunteer_details(uuid) to authenticated;
grant execute on function public.get_ranked_open_requests() to authenticated;
grant execute on function public.can_chat_in_match(uuid) to authenticated;
