-- 匿名树洞 V2 数据库升级脚本
-- 运行位置：Supabase Dashboard -> SQL Editor

-- 1. posts 表新增字段
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS anonymous_name text,
ADD COLUMN IF NOT EXISTS anonymous_avatar text,
ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- 2. comments 表新增字段
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_author boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS anonymous_name text,
ADD COLUMN IF NOT EXISTS anonymous_avatar text;

-- 3. 新增 post_anonymous_identities 表
-- 用于记录用户在特定帖子下的专属马甲，确保同一用户在同一帖子下的评论马甲一致
CREATE TABLE IF NOT EXISTS public.post_anonymous_identities (
  identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(post_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  anonymous_name text NOT NULL,
  anonymous_avatar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_anonymous_identities_post_user_unique UNIQUE (post_id, user_id)
);

-- 4. 补充索引以提升查询性能
CREATE INDEX IF NOT EXISTS post_anonymous_identities_post_id_idx ON public.post_anonymous_identities(post_id);
