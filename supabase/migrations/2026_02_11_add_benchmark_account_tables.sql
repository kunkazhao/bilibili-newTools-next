create table if not exists public.benchmark_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage_link text,
  created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.benchmark_account_videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.benchmark_accounts(id) on delete cascade,
  bvid text not null,
  title text,
  link text,
  cover text,
  author text,
  duration integer,
  pub_time timestamptz,
  stats jsonb,
  payload jsonb,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

create unique index if not exists benchmark_account_videos_account_bvid_uidx
  on public.benchmark_account_videos (account_id, bvid);

create index if not exists benchmark_account_videos_account_pub_time_idx
  on public.benchmark_account_videos (account_id, pub_time desc);
