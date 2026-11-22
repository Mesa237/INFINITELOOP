-- CouCouMTL community: posts with photos/videos and comments, plus clubs
-- run by volunteers (e.g. "French A1", "Winter in MTL") with live sessions.

-- ---------- Posts ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text check (body is null or char_length(btrim(body)) <= 2000),
  media_url text check (media_url is null or char_length(media_url) <= 1000),
  media_type text check (media_type is null or media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  constraint posts_need_content check (
    (body is not null and char_length(btrim(body)) > 0) or media_url is not null
  ),
  constraint posts_media_pair check ((media_url is null) = (media_type is null))
);
create index posts_created_idx on public.posts (created_at desc);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;

create policy "Signed-in users see posts from people they have not blocked"
  on public.posts for select to authenticated
  using (not public.is_blocked_with(author_id));
create policy "Users publish their own posts"
  on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "Users delete their own posts"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "Signed-in users see comments from people they have not blocked"
  on public.post_comments for select to authenticated
  using (not public.is_blocked_with(author_id));
create policy "Users comment as themselves"
  on public.post_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id and not public.is_blocked_with(p.author_id)
    )
  );
create policy "Users delete their own comments"
  on public.post_comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------- Clubs ----------
create function public.is_volunteer(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user_id and p.role in ('volunteer', 'both')
  );
$$;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  category text not null default 'other' check (
    category in ('language', 'newcomers', 'winter', 'city_life', 'environment',
                 'technology', 'books', 'sports', 'other')
  ),
  description text check (description is null or char_length(btrim(description)) <= 1000),
  created_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table public.club_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  room_code text not null default replace(gen_random_uuid()::text, '-', ''),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index club_sessions_one_live
  on public.club_sessions (club_id) where ended_at is null;

create table public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index club_messages_club_idx on public.club_messages (club_id, created_at);

create function public.is_club_member(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = target_club_id and m.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.clubs c
    where c.id = target_club_id and c.owner_id = (select auth.uid())
  );
$$;

create function public.is_club_owner(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clubs c
    where c.id = target_club_id and c.owner_id = (select auth.uid())
  );
$$;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_sessions enable row level security;
alter table public.club_messages enable row level security;

create policy "Signed-in users can browse clubs"
  on public.clubs for select to authenticated using (true);
create policy "Volunteers create clubs"
  on public.clubs for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_volunteer((select auth.uid())));
create policy "Owners edit their clubs"
  on public.clubs for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete their clubs"
  on public.clubs for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Signed-in users see who is in clubs"
  on public.club_members for select to authenticated using (true);
create policy "Users join clubs themselves"
  on public.club_members for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users leave clubs themselves"
  on public.club_members for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Signed-in users see club sessions"
  on public.club_sessions for select to authenticated using (true);
create policy "Club owners start sessions"
  on public.club_sessions for insert to authenticated
  with check (started_by = (select auth.uid()) and public.is_club_owner(club_id));
create policy "Club owners end sessions"
  on public.club_sessions for update to authenticated
  using (public.is_club_owner(club_id)) with check (public.is_club_owner(club_id));

create policy "Club members read the club chat"
  on public.club_messages for select to authenticated
  using (public.is_club_member(club_id));
create policy "Club members write in the club chat"
  on public.club_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_club_member(club_id));

-- ---------- Grants (this project does not grant new tables automatically) ----------
grant select, insert, delete on table public.posts to authenticated;
grant select, insert, delete on table public.post_comments to authenticated;
grant select, insert, update, delete on table public.clubs to authenticated;
grant select, insert, delete on table public.club_members to authenticated;
grant select, insert, update on table public.club_sessions to authenticated;
grant select, insert on table public.club_messages to authenticated;
revoke all on function public.is_volunteer(uuid) from public, anon;
revoke all on function public.is_club_member(uuid) from public, anon;
revoke all on function public.is_club_owner(uuid) from public, anon;
grant execute on function public.is_volunteer(uuid) to authenticated;
grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.is_club_owner(uuid) to authenticated;

-- ---------- Storage for post photos and videos (25 MB max) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coucou-posts', 'coucou-posts', true, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic',
        'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'coucou-posts');
create policy "Users upload post media in their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'coucou-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users delete their own post media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'coucou-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------- Live updates ----------
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.club_sessions;
alter publication supabase_realtime add table public.club_messages;
