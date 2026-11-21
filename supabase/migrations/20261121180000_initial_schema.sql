-- CouCouMontreal initial application schema.
-- Apply with Supabase migrations; do not run this against production until reviewed.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New member'
    check (char_length(btrim(display_name)) between 1 and 80),
  role text not null default 'seeker'
    check (role in ('seeker', 'volunteer', 'both')),
  languages text[] not null default '{}',
  neighborhood text check (
    neighborhood is null or char_length(btrim(neighborhood)) between 1 and 80
  ),
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sensitive matching preferences stay private to their owner.
create table public.profile_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  origin_country_code text check (
    origin_country_code is null or origin_country_code ~ '^[A-Z]{2}$'
  ),
  use_origin_for_matching boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (
    char_length(btrim(description)) between 10 and 2000
  ),
  help_type text not null check (
    help_type in (
      'appointments',
      'paperwork',
      'transportation',
      'companionship',
      'language_practice',
      'technology',
      'other'
    )
  ),
  preferred_language text,
  neighborhood text not null check (
    char_length(btrim(neighborhood)) between 1 and 80
  ),
  requested_for timestamptz,
  status text not null default 'open'
    check (status in ('open', 'matched', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One volunteer may accept each request in this first MVP.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null unique
    references public.help_requests (id) on delete cascade,
  volunteer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now(),
  constraint reviews_no_self_review check (reviewer_id <> reviewee_id),
  constraint reviews_reason_for_low_rating check (
    rating >= 4 or nullif(btrim(reason), '') is not null
  ),
  constraint reviews_one_per_person_per_request unique (help_request_id, reviewer_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  help_request_id uuid references public.help_requests (id) on delete set null,
  category text not null check (
    category in ('safety', 'harassment', 'spam', 'fraud', 'other')
  ),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_need_a_target check (
    reported_user_id is not null or help_request_id is not null
  ),
  constraint reports_no_self_report check (
    reported_user_id is null or reporter_id <> reported_user_id
  )
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_user_id)
);

create index help_requests_open_created_idx
  on public.help_requests (created_at desc)
  where status = 'open';
create index help_requests_requester_idx on public.help_requests (requester_id);
create index matches_volunteer_status_idx on public.matches (volunteer_id, status);
create index reviews_reviewee_created_idx on public.reviews (reviewee_id, created_at desc);
create index reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index blocks_blocked_user_idx on public.blocks (blocked_user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_preferences_set_updated_at
  before update on public.profile_preferences
  for each row execute function public.set_updated_at();
create trigger help_requests_set_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();
create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Create a public-safe profile when an email or other Auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 80), ''),
      'New member'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- These narrowly-scoped SECURITY DEFINER helpers let RLS check related rows
-- without exposing private rows or creating recursive policy evaluation.
create function public.can_view_help_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.help_requests h
    where h.id = target_request_id
      and (
        h.requester_id = (select auth.uid())
        or (
          (select auth.uid()) is not null
          and h.status = 'open'
        )
        or exists (
          select 1
          from public.matches m
          where m.help_request_id = h.id
            and (
              m.volunteer_id = (select auth.uid())
              or h.requester_id = (select auth.uid())
            )
        )
      )
  );
$$;

create function public.is_match_participant(target_match_id uuid)
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
      and (
        m.volunteer_id = (select auth.uid())
        or h.requester_id = (select auth.uid())
      )
  );
$$;

-- Only answers whether the signed-in user and one target have blocked each other.
create function public.is_blocked_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_user_id = target_user_id)
         or (b.blocker_id = target_user_id and b.blocked_user_id = (select auth.uid()))
    );
$$;

-- Expose aggregate scores for recommendations without exposing review text.
create function public.get_profile_rating(target_profile_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select avg(r.rating)::numeric(3, 2), count(*)::bigint
  from public.reviews r
  where r.reviewee_id = target_profile_id;
$$;

create function public.guard_match_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_owner_id uuid;
  actor_id uuid := (select auth.uid());
begin
  if new.help_request_id <> old.help_request_id
     or new.volunteer_id <> old.volunteer_id
     or new.created_at <> old.created_at then
    raise exception 'Match participants and request cannot be changed';
  end if;

  -- Trusted database administration may update rows without an Auth user.
  if actor_id is null then
    return new;
  end if;

  select h.requester_id
    into request_owner_id
    from public.help_requests h
    where h.id = old.help_request_id;

  if old.status = 'pending' then
    if actor_id = request_owner_id
       and new.status in ('accepted', 'rejected') then
      return new;
    elsif actor_id = old.volunteer_id
       and new.status = 'cancelled' then
      return new;
    end if;
  elsif old.status = 'accepted'
        and actor_id in (request_owner_id, old.volunteer_id)
        and new.status in ('completed', 'cancelled') then
    return new;
  elsif new.status = old.status then
    return new;
  end if;

  raise exception 'This match status change is not allowed';
end;
$$;

create trigger matches_guard_update
  before update on public.matches
  for each row execute function public.guard_match_update();

create function public.sync_help_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' then
    update public.help_requests
      set status = 'matched'
      where id = new.help_request_id and status = 'open';
  elsif new.status = 'completed' then
    update public.help_requests
      set status = 'completed'
      where id = new.help_request_id and status = 'matched';
  elsif old.status in ('pending', 'accepted')
        and new.status in ('rejected', 'cancelled') then
    update public.help_requests
      set status = 'open'
      where id = new.help_request_id and status in ('open', 'matched');
  end if;

  return new;
end;
$$;

create trigger matches_sync_help_request_status
  after update of status on public.matches
  for each row execute function public.sync_help_request_status();

alter table public.profiles enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.help_requests enable row level security;
alter table public.matches enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "Signed-in users can view public profile fields"
  on public.profiles for select to authenticated
  using (true);
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users manage their private matching preferences"
  on public.profile_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Signed-in users can view open requests and participants can view theirs"
  on public.help_requests for select to authenticated
  using (public.can_view_help_request(id));
create policy "Users can create their own help requests"
  on public.help_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'open'
  );
create policy "Request owners can update their requests"
  on public.help_requests for update to authenticated
  using (requester_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()));
create policy "Request owners can delete open requests"
  on public.help_requests for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'open');

create policy "Only match participants can view matches"
  on public.matches for select to authenticated
  using (public.is_match_participant(id));
create policy "Volunteers can request an open help match"
  on public.matches for insert to authenticated
  with check (
    volunteer_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.help_requests h
      where h.id = help_request_id
        and h.status = 'open'
        and h.requester_id <> (select auth.uid())
        and not public.is_blocked_with(h.requester_id)
    )
  );
create policy "Match participants can update status"
  on public.matches for update to authenticated
  using (public.is_match_participant(id))
  with check (public.is_match_participant(id));

create policy "Review participants can read review text"
  on public.reviews for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or reviewee_id = (select auth.uid())
  );
create policy "Completed match participants can review each other"
  on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from public.matches m
      join public.help_requests h on h.id = m.help_request_id
      where m.help_request_id = reviews.help_request_id
        and m.status = 'completed'
        and (
          (m.volunteer_id = (select auth.uid()) and h.requester_id = reviewee_id)
          or
          (h.requester_id = (select auth.uid()) and m.volunteer_id = reviewee_id)
        )
    )
  );

create policy "Users can file reports about others or requests"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (reported_user_id is null or reported_user_id <> (select auth.uid()))
  );
create policy "Reporters can view their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "Users can manage their own blocks"
  on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (
    blocker_id = (select auth.uid())
    and blocked_user_id <> (select auth.uid())
  );

revoke all on table
  public.profiles,
  public.profile_preferences,
  public.help_requests,
  public.matches,
  public.reviews,
  public.reports,
  public.blocks
from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profile_preferences to authenticated;
grant select, insert, update, delete on table public.help_requests to authenticated;
grant select, insert, update on table public.matches to authenticated;
grant select, insert on table public.reviews to authenticated;
grant select, insert on table public.reports to authenticated;
grant select, insert, delete on table public.blocks to authenticated;

revoke all on function public.can_view_help_request(uuid) from public, anon;
revoke all on function public.is_match_participant(uuid) from public, anon;
revoke all on function public.is_blocked_with(uuid) from public, anon;
revoke all on function public.get_profile_rating(uuid) from public, anon;
grant execute on function public.can_view_help_request(uuid) to authenticated;
grant execute on function public.is_match_participant(uuid) to authenticated;
grant execute on function public.is_blocked_with(uuid) to authenticated;
grant execute on function public.get_profile_rating(uuid) to authenticated;

-- Trigger functions are not intended to be called through the Data API.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_match_update() from public, anon, authenticated;
revoke all on function public.sync_help_request_status() from public, anon, authenticated;
