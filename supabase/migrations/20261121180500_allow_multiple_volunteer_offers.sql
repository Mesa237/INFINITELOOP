-- Allow more than one volunteer to offer help on the same request.
-- Only one offer may be accepted at a time; a rejected/cancelled offer reopens it.

alter table public.matches
  drop constraint matches_help_request_id_key;

alter table public.matches
  add constraint matches_help_request_volunteer_key
  unique (help_request_id, volunteer_id);

create or replace function public.guard_match_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_owner_id uuid;
  request_status text;
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

  select h.requester_id, h.status
    into request_owner_id, request_status
    from public.help_requests h
    where h.id = old.help_request_id;

  if old.status = 'pending' then
    if actor_id = request_owner_id
       and new.status = 'accepted'
       and request_status = 'open' then
      return new;
    elsif actor_id = request_owner_id
       and new.status = 'rejected' then
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

create or replace function public.sync_help_request_status()
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
    update public.help_requests h
      set status = 'open'
      where h.id = new.help_request_id
        and h.status in ('open', 'matched')
        and not exists (
          select 1
          from public.matches m
          where m.help_request_id = new.help_request_id
            and m.id <> new.id
            and m.status in ('accepted', 'completed')
        );
  end if;

  return new;
end;
$$;
