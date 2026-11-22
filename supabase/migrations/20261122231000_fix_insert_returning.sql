-- Fix: "Publish request" and "I'll help" failed with
-- "new row violates row-level security policy".
-- The app saves a row and reads it back in the same call (insert ... select).
-- The read rules only used helper functions that look the row up in the table,
-- and a row created in that same call isn't visible to them yet.
-- Checking the row's own owner column first fixes it. All role rules from
-- 20261122210000_role_based_help_access stay the same.

drop policy if exists "Users can view role-appropriate help requests"
  on public.help_requests;
drop policy if exists "View own, open, or matched help requests"
  on public.help_requests;
-- The original policy's name was cut to 63 characters by Postgres, so an earlier
-- drop with the full name may have missed it. Remove it so the role rules apply.
drop policy if exists "Signed-in users can view open requests and participants can vie"
  on public.help_requests;
create policy "Users can view role-appropriate help requests"
  on public.help_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or public.can_view_help_request(id)
  );

drop policy if exists "Only match participants can view matches"
  on public.matches;
create policy "Only match participants can view matches"
  on public.matches for select to authenticated
  using (
    volunteer_id = (select auth.uid())
    or public.is_match_participant(id)
  );
