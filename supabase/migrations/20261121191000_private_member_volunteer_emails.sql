-- Keep member and volunteer emails private: each user can read only their own row.
-- The app only reads its own row (lib/portal.ts uses .eq('id', userId)), so nothing breaks.
drop policy if exists "Anyone authenticated can view members" on public.members;
drop policy if exists "Anyone authenticated can view volunteers" on public.volunteers;

create policy "Members can view their own row"
  on public.members for select to authenticated
  using ((select auth.uid()) = id);

create policy "Volunteers can view their own row"
  on public.volunteers for select to authenticated
  using ((select auth.uid()) = id);

revoke all on public.members, public.volunteers from anon;
