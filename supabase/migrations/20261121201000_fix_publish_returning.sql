-- Fix: publishing a help request failed with
-- "new row violates row-level security policy for table help_requests".
-- The app inserts and reads the new row back in one call (insert ... returning).
-- The old SELECT policy only called can_view_help_request(id), which looks the
-- row up in the table and cannot see a row created in the same statement.
-- Checking the row's own columns first lets the owner see their new request.
drop policy if exists "Signed-in users can view open requests and participants can vie"
  on public.help_requests;

create policy "View own, open, or matched help requests"
  on public.help_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or ((select auth.uid()) is not null and status = 'open')
    or public.can_view_help_request(id)
  );
