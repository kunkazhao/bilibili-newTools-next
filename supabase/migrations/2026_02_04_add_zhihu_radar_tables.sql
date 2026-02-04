create table if not exists zhihu_keywords (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zhihu_questions (
  id text primary key,
  title text not null,
  url text not null,
  first_keyword_id uuid null references zhihu_keywords(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists zhihu_question_keywords (
  question_id text not null references zhihu_questions(id) on delete cascade,
  keyword_id uuid not null references zhihu_keywords(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (question_id, keyword_id)
);

create table if not exists zhihu_question_stats (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references zhihu_questions(id) on delete cascade,
  stat_date date not null,
  view_count bigint not null,
  answer_count bigint not null,
  fetched_at timestamptz not null default now(),
  unique (question_id, stat_date)
);

create index if not exists zhihu_question_stats_date_idx on zhihu_question_stats(stat_date);
create index if not exists zhihu_question_stats_question_idx on zhihu_question_stats(question_id);
create index if not exists zhihu_questions_keyword_idx on zhihu_questions(first_keyword_id);
