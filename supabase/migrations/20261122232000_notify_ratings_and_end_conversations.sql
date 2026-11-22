alter table public.user_notifications
  add column review_id uuid references public.reviews (id) on delete cascade;

alter table public.user_notifications
  drop constraint if exists user_notifications_notification_type_check;

alter table public.user_notifications
  add constraint user_notifications_notification_type_check
    check (notification_type in ('offer', 'accepted', 'message', 'review'));

drop index if exists public.user_notifications_match_type_unique;
create unique index user_notifications_match_type_unique
  on public.user_notifications (match_id, notification_type)
  where message_id is null
    and review_id is null;

create unique index user_notifications_review_unique
  on public.user_notifications (review_id)
  where review_id is not null;

create or replace function public.notify_reviewee_of_rating()
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
    review_id,
    notification_type
  )
  select
    new.reviewee_id,
    new.reviewer_id,
    new.help_request_id,
    m.id,
    new.id,
    'review'
  from public.matches m
  where m.help_request_id = new.help_request_id
  on conflict (review_id)
    where review_id is not null
    do nothing;

  return new;
end;
$$;

revoke all on function public.notify_reviewee_of_rating()
  from public, anon, authenticated;

create trigger reviews_notify_reviewee
  after insert on public.reviews
  for each row execute function public.notify_reviewee_of_rating();

insert into public.user_notifications (
  recipient_id,
  actor_id,
  help_request_id,
  match_id,
  review_id,
  created_at,
  notification_type
)
select
  r.reviewee_id,
  r.reviewer_id,
  r.help_request_id,
  m.id,
  r.id,
  r.created_at,
  'review'
from public.reviews r
join public.matches m on m.help_request_id = r.help_request_id
on conflict (review_id)
  where review_id is not null
  do nothing;

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
      and m.status in ('accepted', 'completed')
      and (select auth.uid()) in (m.volunteer_id, h.requester_id)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.volunteer_id and b.blocked_user_id = h.requester_id)
           or (b.blocker_id = h.requester_id and b.blocked_user_id = m.volunteer_id)
      )
      and (
        m.status <> 'completed'
        or not exists (
          select 1
          from public.reviews r
          where r.help_request_id = m.help_request_id
            and r.reviewer_id = (select auth.uid())
        )
      )
  );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;
