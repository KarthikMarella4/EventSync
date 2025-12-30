-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  occupation text default 'Member',
  website text,
  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

-- Policies (Drop first to avoid errors)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- 2. EVENTS TABLE
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  category text,
  date text,
  time text,
  location text,
  image_url text,
  creator_id uuid references auth.users not null
);

-- Safely add the column if it doesn't exist (for existing tables)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'events' and column_name = 'google_calendar_event_id') then
    alter table events add column google_calendar_event_id text;
  end if;
end $$;

alter table events enable row level security;

-- Policies (Drop first to avoid errors)
drop policy if exists "Events are viewable by everyone." on events;
create policy "Events are viewable by everyone." on events for select using ( true );

drop policy if exists "Authenticated users can create events." on events;
create policy "Authenticated users can create events." on events for insert with check ( auth.role() = 'authenticated' );

drop policy if exists "Users can update their own events." on events;
create policy "Users can update their own events." on events for update using ( auth.uid() = creator_id );

drop policy if exists "Users can delete their own events." on events;
create policy "Users can delete their own events." on events for delete using ( auth.uid() = creator_id );

-- 3. EVENT PHOTOS TABLE (For Gallery & Uploads)
drop table if exists event_photos;
create table if not exists event_photos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null, -- References profiles for easier joins
  photo_url text not null
);

alter table event_photos enable row level security;

-- Policies for event_photos
drop policy if exists "Photos are viewable by everyone." on event_photos;
create policy "Photos are viewable by everyone." on event_photos for select using ( true );

drop policy if exists "Authenticated users can upload photos to events." on event_photos;
create policy "Authenticated users can upload photos to events." on event_photos for insert with check ( auth.role() = 'authenticated' );

-- 4. STORAGE
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true) on conflict (id) do update set public = true;

-- Explicitly force public=true for existing buckets (Redundant safety check)
update storage.buckets set public = true where id = 'avatars';
update storage.buckets set public = true where id = 'event-images';

-- AVATARS POLICIES
drop policy if exists "Avatars are publicly accessible." on storage.objects;
create policy "Avatars are publicly accessible." on storage.objects for select using ( bucket_id = 'avatars' );

drop policy if exists "Authenticated users can upload avatars." on storage.objects;
create policy "Authenticated users can upload avatars." on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

drop policy if exists "Users can delete their own avatars." on storage.objects;
create policy "Users can delete their own avatars." on storage.objects for delete using ( bucket_id = 'avatars' and auth.uid() = owner );

-- EVENT IMAGES POLICIES

drop policy if exists "Event images are publicly accessible." on storage.objects;
create policy "Event images are publicly accessible." on storage.objects for select using ( bucket_id = 'event-images' );


drop policy if exists "Authenticated users can upload event images." on storage.objects;
create policy "Authenticated users can upload event images." on storage.objects for insert with check ( bucket_id = 'event-images' and auth.role() = 'authenticated' );

drop policy if exists "Users can delete their own event images." on storage.objects;
create policy "Users can delete their own event images." on storage.objects for delete using ( bucket_id = 'event-images' and auth.uid() = owner );

-- Additional Policies for event_photos
drop policy if exists "Users can delete their own photos." on event_photos;
-- 5. TASKS TABLE
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone,
  is_completed boolean default false,
  is_overdue boolean default false, -- Can be calculated, but storing for simple querying/updates
  google_task_id text,
  google_calendar_event_id text
);

-- Safely add the columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'google_task_id') then
    alter table tasks add column google_task_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'google_calendar_event_id') then
    alter table tasks add column google_calendar_event_id text;
  end if;
end $$;

alter table tasks enable row level security;

-- Policies for Tasks
drop policy if exists "Users can view their own tasks." on tasks;
create policy "Users can view their own tasks." on tasks for select using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own tasks." on tasks;
create policy "Users can insert their own tasks." on tasks for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own tasks." on tasks;
create policy "Users can update their own tasks." on tasks for update using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own tasks." on tasks;
create policy "Users can delete their own tasks." on tasks for delete using ( auth.uid() = user_id );

-- 6. NOTIFICATIONS TABLE
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('reminder', 'invite', 'update', 'photo')),
  message text not null,
  is_read boolean default false,
  related_id uuid -- Can reference event_id, task_id, etc.
);

alter table notifications enable row level security;

-- Policies for Notifications
drop policy if exists "Users can view their own notifications." on notifications;
create policy "Users can view their own notifications." on notifications for select using ( auth.uid() = user_id );

drop policy if exists "Users can update their own notifications." on notifications; -- To mark as read
create policy "Users can update their own notifications." on notifications for update using ( auth.uid() = user_id );


-- 7. FIXES & MIGRATIONS

-- Enable Realtime for tasks and event_photos (Idempotent)
do $$
begin
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table event_photos;
exception when duplicate_object then
  null;
end $$;

-- Fix Events -> Profiles Relationship for Gallery
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'events_creator_id_profiles_fkey'
  ) then
    alter table events add constraint events_creator_id_profiles_fkey foreign key (creator_id) references profiles(id);
  end if;
exception when others then
  null; 
end $$;

-- Trigger removed to avoid permission errors (42501). 
-- If you need automatic profile creation, please set it up in the Supabase Dashboard > Authentication > Triggers.

-- Fix for existing users with missing profiles:
insert into public.profiles (id, full_name, avatar_url, username)
select id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url', email
from auth.users
where id not in (select id from public.profiles)
on conflict do nothing;
