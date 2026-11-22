-- CouCouMTL Meet: the fair midpoint uses each person's live location.
-- When someone opens Meet, the app asks for location permission and saves
-- their position for that match only. Coordinates are rounded to about 100 m,
-- are visible only to their owner, and count only if shared in the last 3 hours.
-- The partner never sees the other person's coordinates, only the suggested
-- public places and the distances.

create table public.match_locations (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create function public.round_match_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lat := round(new.lat::numeric, 3)::double precision;
  new.lng := round(new.lng::numeric, 3)::double precision;
  new.updated_at := now();
  return new;
end;
$$;

create trigger match_locations_round
  before insert or update on public.match_locations
  for each row execute function public.round_match_location();

alter table public.match_locations enable row level security;

create policy "People see only their own shared location"
  on public.match_locations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Match participants share their own location"
  on public.match_locations for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_chat_in_match(match_id));
create policy "Match participants update their own location"
  on public.match_locations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_chat_in_match(match_id));
create policy "People can remove their own location"
  on public.match_locations for delete to authenticated
  using (user_id = (select auth.uid()));

-- Has each side shared a fresh location? (No coordinates are returned.)
create function public.match_location_status(target_match_id uuid)
returns table (me_shared boolean, partner_shared boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if not public.is_match_participant(target_match_id) then
    raise exception 'Only the two people in this match can see this';
  end if;
  return query
  select
    exists (
      select 1 from public.match_locations l
      where l.match_id = target_match_id and l.user_id = me
        and l.updated_at > now() - interval '3 hours'
    ),
    exists (
      select 1 from public.match_locations l
      where l.match_id = target_match_id and l.user_id <> me
        and l.updated_at > now() - interval '3 hours'
    );
end;
$$;

-- More real metro stations so people outside downtown also get fair options.
insert into public.public_places (name, kind, lat, lng) values
  ('Côte-Vertu metro',        'metro', 45.5142, -73.6831),
  ('Du Collège metro',        'metro', 45.5093, -73.6747),
  ('Henri-Bourassa metro',    'metro', 45.5557, -73.6681),
  ('Crémazie metro',          'metro', 45.5462, -73.6385),
  ('Saint-Michel metro',      'metro', 45.5596, -73.5999),
  ('Radisson metro',          'metro', 45.5893, -73.5394),
  ('Honoré-Beaugrand metro',  'metro', 45.5966, -73.5356),
  ('Angrignon metro',         'metro', 45.4462, -73.6036),
  ('Montmorency metro',       'metro', 45.5583, -73.7215),
  ('Longueuil metro',         'metro', 45.5250, -73.5219)
on conflict (name) do nothing;

-- Fair midpoint from both live locations: rank public places by the longer of
-- the two trips, then by the total. Needs both people to have shared.
create or replace function public.suggest_meeting_places(target_match_id uuid)
returns table (
  place_id integer,
  name text,
  kind text,
  lat double precision,
  lng double precision,
  member_km numeric,
  volunteer_km numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_id uuid;
  vol_id uuid;
  m_lat double precision;
  m_lng double precision;
  v_lat double precision;
  v_lng double precision;
begin
  if not public.is_match_participant(target_match_id) then
    raise exception 'Only the two people in this match can see meeting suggestions';
  end if;

  select h.requester_id, m.volunteer_id into member_id, vol_id
  from public.matches m
  join public.help_requests h on h.id = m.help_request_id
  where m.id = target_match_id;

  select l.lat, l.lng into m_lat, m_lng
  from public.match_locations l
  where l.match_id = target_match_id and l.user_id = member_id
    and l.updated_at > now() - interval '3 hours';

  select l.lat, l.lng into v_lat, v_lng
  from public.match_locations l
  where l.match_id = target_match_id and l.user_id = vol_id
    and l.updated_at > now() - interval '3 hours';

  if m_lat is null or v_lat is null then
    raise exception 'waiting_for_locations';
  end if;

  return query
  select
    p.id,
    p.name,
    p.kind,
    p.lat,
    p.lng,
    round(public.distance_km(m_lat, m_lng, p.lat, p.lng)::numeric, 1),
    round(public.distance_km(v_lat, v_lng, p.lat, p.lng)::numeric, 1)
  from public.public_places p
  order by
    greatest(public.distance_km(m_lat, m_lng, p.lat, p.lng),
             public.distance_km(v_lat, v_lng, p.lat, p.lng)),
    public.distance_km(m_lat, m_lng, p.lat, p.lng)
      + public.distance_km(v_lat, v_lng, p.lat, p.lng)
  limit 3;
end;
$$;
