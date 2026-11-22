-- CouCouMTL: chat opens as soon as a volunteer offers help, and the
-- "Meet" flow with three location options:
--   A) member     - the member proposes a place
--   B) midpoint   - fairest public place between both neighbourhoods
--   C) volunteer  - the volunteer proposes a place
-- The other person accepts or declines each proposal.

-- 1. Chat opens at the offer (pending), not only after accept.
create or replace function public.can_chat_in_match(target_match_id uuid)
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
      and m.status in ('pending', 'accepted', 'completed')
      and (select auth.uid()) in (m.volunteer_id, h.requester_id)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.volunteer_id and b.blocked_user_id = h.requester_id)
           or (b.blocker_id = h.requester_id and b.blocked_user_id = m.volunteer_id)
      )
  );
$$;

-- 2. Approximate centre of each neighbourhood (used for option B only).
create table public.neighborhood_centres (
  name text primary key,
  lat double precision not null,
  lng double precision not null
);

insert into public.neighborhood_centres (name, lat, lng) values
  ('Downtown',               45.5017, -73.5673),
  ('Le Plateau',             45.5225, -73.5800),
  ('Mile End',               45.5240, -73.6000),
  ('Verdun',                 45.4580, -73.5700),
  ('Côte-des-Neiges',        45.4960, -73.6250),
  ('Notre-Dame-de-Grâce',    45.4740, -73.6150),
  ('Saint-Henri',            45.4770, -73.5850),
  ('Griffintown',            45.4920, -73.5600),
  ('Old Montréal',           45.5075, -73.5545),
  ('Outremont',              45.5170, -73.6080),
  ('Rosemont',               45.5430, -73.5850),
  ('Villeray',               45.5450, -73.6200),
  ('Hochelaga',              45.5450, -73.5450),
  ('Ahuntsic',               45.5560, -73.6600),
  ('Montréal-Nord',          45.5900, -73.6300),
  ('Saint-Laurent',          45.5050, -73.7000),
  ('Lachine',                45.4400, -73.6700),
  ('Montréal',               45.5017, -73.5673)
on conflict (name) do nothing;

-- 3. Public meeting places (metro stations and libraries). Coordinates are approximate.
create table public.public_places (
  id serial primary key,
  name text not null unique,
  kind text not null check (kind in ('metro', 'library', 'community_centre', 'other')),
  lat double precision not null,
  lng double precision not null
);

insert into public.public_places (name, kind, lat, lng) values
  ('Grande Bibliothèque (BAnQ)',  'library', 45.5153, -73.5620),
  ('Berri-UQAM metro',            'metro',   45.5153, -73.5610),
  ('McGill metro',                'metro',   45.5040, -73.5715),
  ('Place-des-Arts metro',        'metro',   45.5080, -73.5680),
  ('Guy-Concordia metro',         'metro',   45.4957, -73.5790),
  ('Atwater metro',               'metro',   45.4893, -73.5860),
  ('Lionel-Groulx metro',         'metro',   45.4829, -73.5799),
  ('Square-Victoria-OACI metro',  'metro',   45.5016, -73.5632),
  ('Mont-Royal metro',            'metro',   45.5246, -73.5817),
  ('Laurier metro',               'metro',   45.5274, -73.5893),
  ('Rosemont metro',              'metro',   45.5317, -73.5973),
  ('Jean-Talon metro',            'metro',   45.5390, -73.6140),
  ('Outremont metro',             'metro',   45.5201, -73.6150),
  ('Côte-des-Neiges metro',       'metro',   45.4964, -73.6230),
  ('Snowdon metro',               'metro',   45.4855, -73.6276),
  ('Verdun metro',                'metro',   45.4594, -73.5718),
  ('Pie-IX metro',                'metro',   45.5537, -73.5516)
on conflict (name) do nothing;

alter table public.neighborhood_centres enable row level security;
alter table public.public_places enable row level security;
create policy "Signed-in users can read neighbourhood centres"
  on public.neighborhood_centres for select to authenticated using (true);
create policy "Signed-in users can read public places"
  on public.public_places for select to authenticated using (true);

-- 4. Distance in km between two points (haversine).
create function public.distance_km(lat1 double precision, lng1 double precision,
                                   lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- 5. Option B: the fairest public places for a match.
--    Ranks places by the LONGER of the two trips (so nobody travels much more
--    than the other), then by the total. Only the two participants can call it.
create function public.suggest_meeting_places(target_match_id uuid)
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
  m_lat double precision;
  m_lng double precision;
  v_lat double precision;
  v_lng double precision;
begin
  if not public.is_match_participant(target_match_id) then
    raise exception 'Only the two people in this match can see meeting suggestions';
  end if;

  select c.lat, c.lng into m_lat, m_lng
  from public.matches m
  join public.help_requests h on h.id = m.help_request_id
  join public.neighborhood_centres c on lower(c.name) = lower(btrim(h.neighborhood))
  where m.id = target_match_id;

  select c.lat, c.lng into v_lat, v_lng
  from public.matches m
  join public.profiles p on p.id = m.volunteer_id
  join public.neighborhood_centres c on lower(c.name) = lower(btrim(p.neighborhood))
  where m.id = target_match_id;

  -- Unknown neighbourhoods fall back to the other person, then to downtown.
  if m_lat is null and v_lat is null then
    m_lat := 45.5017; m_lng := -73.5673; v_lat := m_lat; v_lng := m_lng;
  elsif m_lat is null then
    m_lat := v_lat; m_lng := v_lng;
  elsif v_lat is null then
    v_lat := m_lat; v_lng := m_lng;
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

-- 6. Meeting proposals.
create table public.meeting_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id) on delete cascade,
  option text not null check (option in ('member', 'midpoint', 'volunteer')),
  place_name text not null check (char_length(btrim(place_name)) between 2 and 200),
  public_place_id integer references public.public_places (id),
  lat double precision,
  lng double precision,
  meet_at timestamptz,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meeting_proposals_match_idx on public.meeting_proposals (match_id, created_at desc);

create trigger meeting_proposals_set_updated_at
  before update on public.meeting_proposals
  for each row execute function public.set_updated_at();

-- Who may propose which option, and who may answer.
create function public.guard_meeting_proposal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid;
  volunteer_id uuid;
  actor_id uuid := (select auth.uid());
begin
  select h.requester_id, m.volunteer_id into member_id, volunteer_id
  from public.matches m
  join public.help_requests h on h.id = m.help_request_id
  where m.id = new.match_id;

  if tg_op = 'INSERT' then
    if new.option = 'member' and new.proposed_by <> member_id then
      raise exception 'Only the member can propose their own location';
    elsif new.option = 'volunteer' and new.proposed_by <> volunteer_id then
      raise exception 'Only the volunteer can propose their chosen location';
    end if;
    new.status := 'proposed';
    return new;
  end if;

  -- UPDATE: nothing but the status may change.
  if new.match_id <> old.match_id or new.proposed_by <> old.proposed_by
     or new.option <> old.option or new.place_name <> old.place_name
     or new.meet_at is distinct from old.meet_at then
    raise exception 'Create a new proposal instead of editing this one';
  end if;
  if actor_id is null or new.status = old.status then
    return new;
  end if;
  if old.status = 'proposed' and new.status in ('accepted', 'declined')
     and actor_id <> old.proposed_by then
    return new;
  elsif old.status = 'proposed' and new.status = 'cancelled'
        and actor_id = old.proposed_by then
    return new;
  end if;
  raise exception 'This meeting status change is not allowed';
end;
$$;

create trigger meeting_proposals_guard
  before insert or update on public.meeting_proposals
  for each row execute function public.guard_meeting_proposal();

alter table public.meeting_proposals enable row level security;

create policy "Match participants can see meeting proposals"
  on public.meeting_proposals for select to authenticated
  using (public.can_chat_in_match(match_id));
create policy "Match participants can propose a meeting"
  on public.meeting_proposals for insert to authenticated
  with check (
    proposed_by = (select auth.uid())
    and public.can_chat_in_match(match_id)
  );
create policy "Match participants can answer a meeting proposal"
  on public.meeting_proposals for update to authenticated
  using (public.can_chat_in_match(match_id))
  with check (public.can_chat_in_match(match_id));

alter publication supabase_realtime add table public.meeting_proposals;

-- 7. Permissions.
revoke all on table public.neighborhood_centres, public.public_places, public.meeting_proposals from anon;
grant select on table public.neighborhood_centres, public.public_places to authenticated;
grant select, insert, update on table public.meeting_proposals to authenticated;

revoke all on function public.distance_km(double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.suggest_meeting_places(uuid) from public, anon;
grant execute on function public.distance_km(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.suggest_meeting_places(uuid) to authenticated;
revoke all on function public.guard_meeting_proposal() from public, anon, authenticated;
