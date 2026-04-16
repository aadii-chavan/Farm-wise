-- FarmEzy Supabase Database Schema
-- Last Updated: 2026-03-09

-- 1. Profiles Table (Extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  phone_number text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on public.profiles for select using ( auth.uid() = id );
    create policy "Users can update their own profile" on public.profiles for update using ( auth.uid() = id );
  end if;
end $$;

-- 2. Automation: Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Create Trigger for handle_new_user
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created 
      after insert on auth.users 
      for each row execute procedure public.handle_new_user();
  end if;
end $$;

-- 3. Plots Table
create table if not exists public.plots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  area decimal not null,
  crop_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Plots
alter table public.plots enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own plots') then
    create policy "Users can manage their own plots" 
      on public.plots for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 4. Inventory Table
create table if not exists public.inventory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null,
  quantity decimal not null default 0,
  num_packages decimal,
  size_per_package decimal,
  unit text not null,
  price_per_unit decimal,
  shop_name text,
  company_name text,
  batch_no text,
  payment_mode text default 'Udari',
  invoice_no text,
  note text,
  purchase_date timestamp with time zone,
  interest_rate decimal,
  interest_period text,
  batch_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Inventory
alter table public.inventory enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own inventory') then
    create policy "Users can manage their own inventory" 
      on public.inventory for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 5. Transactions Table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('Income', 'Expense')),
  category text not null,
  amount decimal not null,
  date timestamp with time zone not null,
  plot_id uuid references public.plots(id) on delete set null,
  inventory_item_id uuid references public.inventory(id) on delete set null,
  quantity decimal,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Transactions
alter table public.transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own transactions') then
    create policy "Users can manage their own transactions" 
      on public.transactions for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 6. User Settings (Season Date) Table
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  season_start_date timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for User Settings
alter table public.user_settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own settings') then
    create policy "Users can manage their own settings" 
      on public.user_settings for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 7. Tasks Table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  time text not null,
  date text not null,
  category text not null,
  plot text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Tasks
alter table public.tasks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own tasks') then
    create policy "Users can manage their own tasks" 
      on public.tasks for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 8. Custom Entities (Shops & Categories) Table
create table if not exists public.custom_entities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entity_type text not null, -- 'category' or 'shop'
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, entity_type, name)
);

-- Enable RLS for Custom Entities
alter table public.custom_entities enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own custom entities') then
    create policy "Users can manage their own custom entities" 
      on public.custom_entities for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 9. General Expenses Table
create table if not exists public.general_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount decimal not null,
  date timestamp with time zone not null,
  category text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for General Expenses
alter table public.general_expenses enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own general expenses') then
    create policy "Users can manage their own general expenses" 
      on public.general_expenses for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 10. Labor Module Tables

-- Labor Profiles (Workers)
create table if not exists public.labor_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('Daily', 'Annual', 'Contract')),
  base_wage decimal, -- Daily rate or Annual salary
  phone text,
  start_date date,
  is_active boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Labor Profiles
alter table public.labor_profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own labor profiles') then
    create policy "Users can manage their own labor profiles" 
      on public.labor_profiles for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- Labor Attendance
create table if not exists public.labor_attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  worker_id uuid references public.labor_profiles(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('Present', 'Absent', 'Half-Day')),
  plot_id uuid references public.plots(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(worker_id, date),
  notes text
);

-- Enable RLS for Labor Attendance
alter table public.labor_attendance enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own labor attendance') then
    create policy "Users can manage their own labor attendance" 
      on public.labor_attendance for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- Labor Contracts
create table if not exists public.labor_contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contractor_id uuid references public.labor_profiles(id) on delete cascade not null,
  project_name text not null,
  total_amount decimal not null,
  deadline date,
  advance_paid decimal default 0,
  status text not null check (status in ('Active', 'Completed', 'Cancelled')) default 'Active',
  plot_id uuid references public.plots(id) on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Labor Contracts
alter table public.labor_contracts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own labor contracts') then
    create policy "Users can manage their own labor contracts" 
      on public.labor_contracts for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- Labor Transactions (Payments/Settlements)
create table if not exists public.labor_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  worker_id uuid references public.labor_profiles(id) on delete cascade not null,
  amount decimal not null,
  date date not null,
  type text not null check (type in ('Weekly Settle', 'Annual Installment', 'Contract Advance', 'Other')),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Labor Transactions
alter table public.labor_transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own labor transactions') then
    create policy "Users can manage their own labor transactions" 
      on public.labor_transactions for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 11. Rain Meter Table
create table if not exists public.rain_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  time text not null,
  amount decimal not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Rain Meter
alter table public.rain_records enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own rain records') then
    create policy "Users can manage their own rain records" 
      on public.rain_records for all 
      using ( auth.uid() = user_id );
  end if;
end $$;
