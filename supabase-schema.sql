-- Таблица пользователей (расширяет встроенную auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Таблица групп (для объединения пользователей)
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Таблица связей пользователь-группа
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(group_id, user_id)
);

-- Таблица задач (с привязкой к пользователю и группе)
create table public.tasks (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  total_hours numeric not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Таблица назначений
create table public.assignments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade,
  day_id text not null,
  hours numeric not null,
  sort_order numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Индексы для производительности
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_group_id on public.tasks(group_id);
create index idx_assignments_task_id on public.assignments(task_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_group_members_group_id on public.group_members(group_id);

-- Включаем RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tasks enable row level security;
alter table public.assignments enable row level security;

-- Политики для profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Политики для groups
create policy "Members can view their groups" on public.groups
  for select using (
    id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Group owners can update their groups" on public.groups
  for update using (
    created_by = auth.uid()
  );

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);

-- Политики для group_members
create policy "Members can view group members" on public.group_members
  for select using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can join groups" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "Users can leave groups" on public.group_members
  for delete using (auth.uid() = user_id);

-- Политики для tasks
create policy "Users can view own tasks" on public.tasks
  for select using (
    user_id = auth.uid() 
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can create own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" on public.tasks
  for update using (
    user_id = auth.uid() 
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can delete own tasks" on public.tasks
  for delete using (
    user_id = auth.uid() 
    or group_id in (select group_id from public.group_members where user_id = auth.uid() 
                    and role = 'owner')
  );

-- Политики для assignments
create policy "Users can view assignments for their tasks" on public.assignments
  for select using (
    task_id in (
      select id from public.tasks 
      where user_id = auth.uid() 
      or group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
  );

create policy "Users can create assignments for their tasks" on public.assignments
  for insert with check (
    task_id in (
      select id from public.tasks 
      where user_id = auth.uid() 
      or group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
  );

create policy "Users can update assignments for their tasks" on public.assignments
  for update using (
    task_id in (
      select id from public.tasks 
      where user_id = auth.uid() 
      or group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
  );

create policy "Users can delete assignments for their tasks" on public.assignments
  for delete using (
    task_id in (
      select id from public.tasks 
      where user_id = auth.uid() 
      or group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
  );

-- Функция для автоматического создания профиля при регистрации
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Триггер для автоматического создания профиля
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
