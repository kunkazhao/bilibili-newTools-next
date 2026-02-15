create table if not exists public.commission_state (
  id text primary key,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.commission_state (id, items)
values ('default', '[]'::jsonb)
on conflict (id) do nothing;
