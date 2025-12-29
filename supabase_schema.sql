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
insert into storage.buckets (id, name) values ('avatars', 'avatars') on conflict (id) do nothing;
insert into storage.buckets (id, name) values ('event-images', 'event-images') on conflict (id) do nothing;

drop policy if exists "Event images are publicly accessible." on storage.objects;
create policy "Event images are publicly accessible." on storage.objects for select using ( bucket_id = 'event-images' );

drop policy if exists "Authenticated users can upload event images." on storage.objects;
create policy "Authenticated users can upload event images." on storage.objects for insert with check ( bucket_id = 'event-images' and auth.role() = 'authenticated' );
