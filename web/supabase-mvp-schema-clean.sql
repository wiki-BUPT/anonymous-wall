create extension if not exists pgcrypto;

create table if not exists public.users (
  user_id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  password_hash text not null,
  role integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  post_id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(user_id) on delete cascade,
  content text not null,
  tag text not null,
  bg_color text not null,
  likes_count integer not null default 0,
  status integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  comment_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(post_id) on delete cascade,
  author_id uuid not null references public.users(user_id) on delete cascade,
  content text not null,
  status integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  like_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(post_id) on delete cascade,
  user_id uuid not null references public.users(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_post_id_user_id_unique unique (post_id, user_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_tag_idx on public.posts(tag);
create index if not exists comments_post_id_created_at_idx on public.comments(post_id, created_at desc);

