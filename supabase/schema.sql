-- Metro Mentor database schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)

-- ========== PROFILES ==========
-- Extends Supabase's built-in auth.users with our own fields.
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null check (role in ('student','mentor','staff','teacher','admin')),
  period int check (period between 1 and 8),
  parent_email text,
  consent_given boolean default false,
  conduct_agreed boolean default false,
  grade text,
  created_at timestamp with time zone default now()
);

-- ========== MENTOR PROFILE DATA ==========
-- Extra fields specific to mentors (subjects, availability, hours).
create table mentor_profiles (
  id uuid references profiles(id) on delete cascade primary key,
  subjects text[] default '{}',
  days text[] default '{}',
  hours_certified numeric default 0
);

create table mentor_ratings (
  id bigint generated always as identity primary key,
  mentor_id uuid references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  created_at timestamp with time zone default now()
);

-- ========== SUBJECTS ==========
create table subjects (
  id bigint generated always as identity primary key,
  name text unique not null
);

insert into subjects (name) values
  ('Algebra 2'), ('Biology'), ('English 3'), ('Spanish 2');

-- ========== REQUESTS ==========
create table requests (
  id bigint generated always as identity primary key,
  student_id uuid references profiles(id) on delete cascade,
  mentor_id uuid references profiles(id) on delete cascade,
  subject text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamp with time zone default now()
);

-- ========== SESSIONS ==========
create table sessions (
  id bigint generated always as identity primary key,
  mentor_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  subject text not null,
  hours numeric not null,
  recurring boolean default false,
  status text not null default 'awaiting-confirmation'
    check (status in ('awaiting-confirmation','pending-certification','certified','disputed')),
  rating int check (rating between 1 and 5),
  feedback text,
  created_at timestamp with time zone default now()
);

-- ========== MATERIALS ==========
create table materials (
  id bigint generated always as identity primary key,
  teacher_id uuid references profiles(id) on delete cascade,
  subject text not null,
  title text not null,
  file_path text, -- path in Supabase Storage, set after upload
  created_at timestamp with time zone default now()
);

-- ========== REPORTS ==========
create table reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references profiles(id) on delete cascade,
  category text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamp with time zone default now()
);

-- ========== ROW LEVEL SECURITY ==========
-- These are intentionally permissive for a first working version.
-- Before real students use this, tighten these policies (e.g. students should
-- only see their own requests/sessions, not everyone else's).

alter table profiles enable row level security;
alter table mentor_profiles enable row level security;
alter table mentor_ratings enable row level security;
alter table subjects enable row level security;
alter table requests enable row level security;
alter table sessions enable row level security;
alter table materials enable row level security;
alter table reports enable row level security;

create policy "Logged in users can read everything" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

create policy "Logged in users can read mentor profiles" on mentor_profiles for select using (auth.role() = 'authenticated');
create policy "Mentors can update their own profile" on mentor_profiles for all using (auth.uid() = id);

create policy "Logged in users can read ratings" on mentor_ratings for select using (auth.role() = 'authenticated');
create policy "Logged in users can insert ratings" on mentor_ratings for insert with check (auth.role() = 'authenticated');

create policy "Everyone can read subjects" on subjects for select using (true);
create policy "Logged in users can manage subjects" on subjects for all using (auth.role() = 'authenticated');

create policy "Logged in users can read requests" on requests for select using (auth.role() = 'authenticated');
create policy "Logged in users can manage requests" on requests for all using (auth.role() = 'authenticated');

create policy "Logged in users can read sessions" on sessions for select using (auth.role() = 'authenticated');
create policy "Logged in users can manage sessions" on sessions for all using (auth.role() = 'authenticated');

create policy "Logged in users can read materials" on materials for select using (auth.role() = 'authenticated');
create policy "Logged in users can manage materials" on materials for all using (auth.role() = 'authenticated');

create policy "Logged in users can read reports" on reports for select using (auth.role() = 'authenticated');
create policy "Logged in users can manage reports" on reports for all using (auth.role() = 'authenticated');
