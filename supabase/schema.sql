-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  name text,
  created_at timestamptz default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- THEMES TABLE
create table public.themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  style jsonb, -- Stores the ThemeStyle object
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.themes enable row level security;

create policy "Users can view own themes"
  on public.themes for select
  using ( auth.uid() = user_id );

create policy "Users can insert own themes"
  on public.themes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own themes"
  on public.themes for update
  using ( auth.uid() = user_id );

create policy "Users can delete own themes"
  on public.themes for delete
  using ( auth.uid() = user_id );


-- TASKS TABLE
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  theme_id uuid references public.themes(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  title text not null,
  description text,
  category text,
  due_date timestamptz,
  estimated_minutes integer,
  completed boolean default false,
  is_ai_generated boolean default false,
  is_important boolean default false,
  subtasks jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own tasks"
  on public.tasks for update
  using ( auth.uid() = user_id );

create policy "Users can delete own tasks"
  on public.tasks for delete
  using ( auth.uid() = user_id );


-- STORIES TABLE
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  theme_id uuid references public.themes(id) on delete cascade,
  title text not null,
  description text,
  is_important boolean default false,
  created_at timestamptz default now()
);

alter table public.stories enable row level security;

create policy "Users can view own stories"
  on public.stories for select
  using ( auth.uid() = user_id );

create policy "Users can insert own stories"
  on public.stories for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own stories"
  on public.stories for update
  using ( auth.uid() = user_id );

create policy "Users can delete own stories"
  on public.stories for delete
  using ( auth.uid() = user_id );

