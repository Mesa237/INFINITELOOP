-- Create separate tables for volunteers and members.
-- All existing emails are placed into the members table so they cannot sign in as volunteers.

-- 1. Members table
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Member'
    check (char_length(btrim(display_name)) between 1 and 80),
  languages text[] not null default '{}',
  neighborhood text check (
    neighborhood is null or char_length(btrim(neighborhood)) between 1 and 80
  ),
  bio text check (bio is null or char_length(bio) <= 500),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Volunteers table
create table if not exists public.volunteers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Volunteer'
    check (char_length(btrim(display_name)) between 1 and 80),
  languages text[] not null default '{}',
  neighborhood text check (
    neighborhood is null or char_length(btrim(neighborhood)) between 1 and 80
  ),
  bio text check (bio is null or char_length(bio) <= 500),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on both tables
alter table public.members enable row level security;
alter table public.volunteers enable row level security;

-- Policies for Members
create policy "Anyone authenticated can view members"
  on public.members for select
  using ((select auth.uid()) is not null);

create policy "Members can update their own profile"
  on public.members for update
  using ((select auth.uid()) = id);

create policy "Members can insert their own profile"
  on public.members for insert
  with check ((select auth.uid()) = id);

-- Policies for Volunteers
create policy "Anyone authenticated can view volunteers"
  on public.volunteers for select
  using ((select auth.uid()) is not null);

create policy "Volunteers can update their own profile"
  on public.volunteers for update
  using ((select auth.uid()) = id);

create policy "Volunteers can insert their own profile"
  on public.volunteers for insert
  with check ((select auth.uid()) = id);

grant all on public.members to authenticated;
grant all on public.volunteers to authenticated;

-- 3. Populate MEMBERS table with ALL existing emails from auth.users and profiles
insert into public.members (id, email, display_name, languages, neighborhood, bio)
select
  u.id,
  lower(trim(u.email)) as email,
  coalesce(nullif(trim(p.display_name), ''), nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), 'Member') as display_name,
  coalesce(p.languages, '{}') as languages,
  p.neighborhood,
  p.bio
from auth.users u
left join public.profiles p on p.id = u.id
where u.email is not null
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  languages = excluded.languages,
  neighborhood = excluded.neighborhood,
  bio = excluded.bio;

-- Ensure profiles.role for these existing members is set to 'seeker'
update public.profiles
set role = 'seeker'
where id in (select id from public.members);

-- 4. Enforce strict single-role exclusivity at database level (unless registered as 'both')
create or replace function public.check_single_role_exclusivity()
returns trigger
language plpgsql
as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = new.id;
  if (user_role = 'both') then
    return new; -- 'both' users are explicitly allowed in both tables
  end if;

  if (tg_table_name = 'volunteers') then
    if exists (select 1 from public.members where id = new.id) then
      raise exception 'This account is already registered as a Member and cannot be added as a Volunteer.';
    end if;
  elsif (tg_table_name = 'members') then
    if exists (select 1 from public.volunteers where id = new.id) then
      raise exception 'This account is already registered as a Volunteer and cannot be added as a Member.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_volunteer_not_member on public.volunteers;
create trigger ensure_volunteer_not_member
  before insert on public.volunteers
  for each row execute function public.check_single_role_exclusivity();

drop trigger if exists ensure_member_not_volunteer on public.members;
create trigger ensure_member_not_volunteer
  before insert on public.members
  for each row execute function public.check_single_role_exclusivity();
