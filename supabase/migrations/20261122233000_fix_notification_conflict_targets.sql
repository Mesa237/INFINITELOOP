-- The ratings migration narrowed user_notifications_match_type_unique to
-- "message_id is null and review_id is null". The offer and accepted triggers
-- still used "where message_id is null", which no longer matches any index, so
-- every "Offer to help" and every "Accept" failed. Match the new index.

create or replace function public.notify_help_request_owner_of_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    insert into public.user_notifications (
      recipient_id, actor_id, help_request_id, match_id, notification_type
    )
    select h.requester_id, new.volunteer_id, h.id, new.id, 'offer'
    from public.help_requests h
    where h.id = new.help_request_id
      and h.requester_id <> new.volunteer_id
    on conflict (match_id, notification_type)
      where message_id is null and review_id is null
      do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_volunteer_of_accepted_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'accepted' then
    insert into public.user_notifications (
      recipient_id, actor_id, help_request_id, match_id, notification_type
    )
    select new.volunteer_id, h.requester_id, h.id, new.id, 'accepted'
    from public.help_requests h
    where h.id = new.help_request_id
      and h.requester_id <> new.volunteer_id
    on conflict (match_id, notification_type)
      where message_id is null and review_id is null
      do nothing;
  end if;
  return new;
end;
$$;
