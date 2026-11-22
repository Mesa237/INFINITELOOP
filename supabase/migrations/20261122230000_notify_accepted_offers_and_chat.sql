alter table public.user_notifications
  add column notification_type text not null default 'offer'
    check (notification_type in ('offer', 'accepted', 'message')),
  add column message_id uuid references public.messages (id) on delete cascade,
  add constraint user_notifications_message_type_consistency
    check ((notification_type = 'message') = (message_id is not null));

alter table public.user_notifications
  drop constraint user_notifications_match_id_key;

create unique index user_notifications_match_type_unique
  on public.user_notifications (match_id, notification_type)
  where message_id is null;
create unique index user_notifications_message_unique
  on public.user_notifications (message_id)
  where message_id is not null;

create or replace function public.notify_help_request_owner_of_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    insert into public.user_notifications (
      recipient_id,
      actor_id,
      help_request_id,
      match_id,
      notification_type
    )
    select
      h.requester_id,
      new.volunteer_id,
      h.id,
      new.id,
      'offer'
    from public.help_requests h
    where h.id = new.help_request_id
      and h.requester_id <> new.volunteer_id
    on conflict (match_id, notification_type)
      where message_id is null
      do nothing;
  end if;

  return new;
end;
$$;

create function public.notify_volunteer_of_accepted_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'accepted' then
    insert into public.user_notifications (
      recipient_id,
      actor_id,
      help_request_id,
      match_id,
      notification_type
    )
    select
      new.volunteer_id,
      h.requester_id,
      h.id,
      new.id,
      'accepted'
    from public.help_requests h
    where h.id = new.help_request_id
      and h.requester_id <> new.volunteer_id
    on conflict (match_id, notification_type)
      where message_id is null
      do nothing;
  end if;

  return new;
end;
$$;

create function public.notify_chat_recipient_of_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_notifications (
    recipient_id,
    actor_id,
    help_request_id,
    match_id,
    message_id,
    notification_type
  )
  select
    case
      when new.sender_id = m.volunteer_id then h.requester_id
      else m.volunteer_id
    end,
    new.sender_id,
    h.id,
    m.id,
    new.id,
    'message'
  from public.matches m
  join public.help_requests h on h.id = m.help_request_id
  where m.id = new.match_id
    and m.status in ('accepted', 'completed')
    and new.sender_id in (m.volunteer_id, h.requester_id)
  on conflict (message_id)
    where message_id is not null
    do nothing;

  return new;
end;
$$;

revoke all on function public.notify_help_request_owner_of_offer()
  from public, anon, authenticated;
revoke all on function public.notify_volunteer_of_accepted_offer()
  from public, anon, authenticated;
revoke all on function public.notify_chat_recipient_of_message()
  from public, anon, authenticated;

create trigger matches_notify_volunteer_of_acceptance
  after update of status on public.matches
  for each row execute function public.notify_volunteer_of_accepted_offer();
create trigger messages_notify_chat_recipient
  after insert on public.messages
  for each row execute function public.notify_chat_recipient_of_message();

insert into public.user_notifications (
  recipient_id,
  actor_id,
  help_request_id,
  match_id,
  created_at,
  notification_type
)
select
  m.volunteer_id,
  h.requester_id,
  h.id,
  m.id,
  m.updated_at,
  'accepted'
from public.matches m
join public.help_requests h on h.id = m.help_request_id
where m.status in ('accepted', 'completed')
  and h.requester_id <> m.volunteer_id
on conflict (match_id, notification_type)
  where message_id is null
  do nothing;

insert into public.user_notifications (
  recipient_id,
  actor_id,
  help_request_id,
  match_id,
  message_id,
  created_at,
  notification_type
)
select
  case
    when msg.sender_id = m.volunteer_id then h.requester_id
    else m.volunteer_id
  end,
  msg.sender_id,
  h.id,
  m.id,
  msg.id,
  msg.created_at,
  'message'
from public.messages msg
join public.matches m on m.id = msg.match_id
join public.help_requests h on h.id = m.help_request_id
where m.status in ('accepted', 'completed')
  and msg.sender_id in (m.volunteer_id, h.requester_id)
on conflict (message_id)
  where message_id is not null
  do nothing;
