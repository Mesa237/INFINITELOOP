create or replace function public.can_view_help_request(target_request_id uuid)
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
          h.status = 'open'
          and exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('volunteer', 'both')
          )
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

drop policy if exists "Signed-in users can view open requests and participants can view theirs"
  on public.help_requests;
drop policy if exists "View own, open, or matched help requests"
  on public.help_requests;
create policy "Users can view role-appropriate help requests"
  on public.help_requests for select to authenticated
  using (public.can_view_help_request(id));

drop policy if exists "Users can create their own help requests"
  on public.help_requests;
create policy "Members can create their own help requests"
  on public.help_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'open'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('seeker', 'both')
    )
  );

drop policy if exists "Request owners can update their requests"
  on public.help_requests;
create policy "Members can update their own requests"
  on public.help_requests for update to authenticated
  using (
    requester_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('seeker', 'both')
    )
  )
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('seeker', 'both')
    )
  );

drop policy if exists "Request owners can delete open requests"
  on public.help_requests;
create policy "Members can delete their own open requests"
  on public.help_requests for delete to authenticated
  using (
    requester_id = (select auth.uid())
    and status = 'open'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('seeker', 'both')
    )
  );

drop policy if exists "Volunteers can request an open help match"
  on public.matches;
create policy "Volunteers can request an open help match"
  on public.matches for insert to authenticated
  with check (
    volunteer_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('volunteer', 'both')
    )
    and exists (
      select 1
      from public.help_requests h
      where h.id = help_request_id
        and h.status = 'open'
        and h.requester_id <> (select auth.uid())
        and not public.is_blocked_with(h.requester_id)
    )
  );
