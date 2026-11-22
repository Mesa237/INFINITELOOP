create or replace function public.guard_match_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_owner_id uuid;
  volunteer_role text;
  actor_id uuid := (select auth.uid());
begin
  if new.help_request_id <> old.help_request_id
     or new.volunteer_id <> old.volunteer_id
     or new.created_at <> old.created_at then
    raise exception 'Match participants and request cannot be changed';
  end if;

  if actor_id is null then
    return new;
  end if;

  select h.requester_id
    into request_owner_id
    from public.help_requests h
    where h.id = old.help_request_id;

  if old.status = 'pending' then
    if actor_id = request_owner_id
       and new.status = 'accepted' then
      select p.role
        into volunteer_role
        from public.profiles p
        where p.id = old.volunteer_id;

      if volunteer_role is null
         or volunteer_role not in ('volunteer', 'both') then
        raise exception 'Only a volunteer or a person with both roles can be accepted';
      end if;

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
