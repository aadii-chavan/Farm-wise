-- Workbook Module Setup
-- This script creates the tables for the dynamic Workbook feature within plots.

-- 1. Workbook Templates Table
-- Stores the custom column definitions for each plot.
create table if not exists public.workbook_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plot_id uuid references public.plots(id) on delete cascade not null,
  columns jsonb not null default '[]'::jsonb,
  sort_by text, -- Column ID to sort by
  sort_order text check (sort_order in ('asc', 'desc')) default 'desc',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(plot_id) -- One template per plot
);

-- Enable RLS for Workbook Templates
alter table public.workbook_templates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own workbook templates') then
    create policy "Users can manage their own workbook templates" 
      on public.workbook_templates for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- 2. Workbook Entries Table
-- Stores the actual records based on the templates.
create table if not exists public.workbook_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plot_id uuid references public.plots(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for Workbook Entries
alter table public.workbook_entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own workbook entries') then
    create policy "Users can manage their own workbook entries" 
      on public.workbook_entries for all 
      using ( auth.uid() = user_id );
  end if;
end $$;

-- Function to handle plot deletions (cascading cleanup just in case, though references handle it)
-- References are already set to "on delete cascade" for both tables.
