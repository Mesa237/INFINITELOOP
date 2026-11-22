drop policy if exists "Members can delete their own open requests"
  on public.help_requests;
create policy "Owners can delete their own open requests"
  on public.help_requests for delete to authenticated
  using (
    requester_id = (select auth.uid())
    and status = 'open'
  );
