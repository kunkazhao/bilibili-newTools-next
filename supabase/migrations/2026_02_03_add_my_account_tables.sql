alter table public.comment_accounts
  add column if not exists homepage_link text;

create table if not exists public.account_videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.comment_accounts(id) on delete cascade,
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

create unique index if not exists account_videos_account_bvid_uidx
  on public.account_videos (account_id, bvid);
