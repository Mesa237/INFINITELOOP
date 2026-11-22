alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'coucou-profile-pictures',
  'coucou-profile-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Profile pictures are publicly readable"
  on storage.objects for select
  using (bucket_id = 'coucou-profile-pictures');

create policy "Users upload their own profile picture"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'coucou-profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update their own profile picture"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'coucou-profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'coucou-profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
