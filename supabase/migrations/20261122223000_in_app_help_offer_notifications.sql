create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  match_id uuid not null unique references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint user_notifications_no_self_notification
    check (recipient_id <> actor_id)
);

create index user_notifications_recipient_created_idx
  on public.user_notifications (recipient_id, created_at desc);

alter table public.user_notifications enable row level security;
revoke all on table public.user_notifications from anon, authenticated;
grant select on table public.user_notifications to authenticated;
grant update (read_at) on table public.user_notifications to authenticated;

create policy "Recipients can view their notifications"
  on public.user_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "Recipients can mark their notifications as read"
  on public.user_notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create function public.notify_help_request_owner_of_offer()
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
      match_id
    )
    select
      h.requester_id,
      new.volunteer_id,
      h.id,
      new.id
    from public.help_requests h
    where h.id = new.help_request_id
      and h.requester_id <> new.volunteer_id
    on conflict (match_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_help_request_owner_of_offer()
  from public, anon, authenticated;

create trigger matches_notify_help_request_owner
  after insert on public.matches
  for each row execute function public.notify_help_request_owner_of_offer();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end;
$$;
