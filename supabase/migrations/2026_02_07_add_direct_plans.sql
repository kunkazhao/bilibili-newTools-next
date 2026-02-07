create table if not exists public.direct_plans (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  category text not null,
  brand text not null,
  commission_rate text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists direct_plans_sort_idx
  on public.direct_plans (sort_order);
