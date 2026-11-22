create or replace function public.change_my_role(target_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id uuid := auth.uid();
  user_email text;
  user_display_name text;
  user_languages text[];
  user_neighborhood text;
  user_bio text;
begin
  if user_id is null then
    raise exception 'You must be signed in to change your role.';
  end if;

  if target_role is null or target_role not in ('seeker', 'volunteer', 'both') then
    raise exception 'Choose a valid role.';
  end if;

  select
    u.email,
    p.display_name,
    p.languages,
    p.neighborhood,
    p.bio
  into
    user_email,
    user_display_name,
    user_languages,
    user_neighborhood,
    user_bio
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = user_id
  for update of p;

  if not found then
    raise exception 'Your profile could not be found.';
  end if;

  if user_email is null then
    raise exception 'Your account needs an email before its role can be changed.';
  end if;

  update public.profiles
  set role = target_role
  where id = user_id;

  if target_role in ('seeker', 'both') then
    insert into public.members (
      id, email, display_name, languages, neighborhood, bio
    )
    values (
      user_id, lower(user_email), user_display_name, user_languages,
      user_neighborhood, user_bio
    )
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      languages = excluded.languages,
      neighborhood = excluded.neighborhood,
      bio = excluded.bio,
      updated_at = now();
  else
    delete from public.members where id = user_id;
  end if;

  if target_role in ('volunteer', 'both') then
    insert into public.volunteers (
      id, email, display_name, languages, neighborhood, bio
    )
    values (
      user_id, lower(user_email), user_display_name, user_languages,
      user_neighborhood, user_bio
    )
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      languages = excluded.languages,
      neighborhood = excluded.neighborhood,
      bio = excluded.bio,
      updated_at = now();
  else
    delete from public.volunteers where id = user_id;
  end if;

  return target_role;
end;
$$;

revoke all on function public.change_my_role(text) from public, anon;
grant execute on function public.change_my_role(text) to authenticated;
