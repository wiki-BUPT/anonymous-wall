-- 用户管理升级脚本
-- 运行位置：Supabase Dashboard -> SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status integer NOT NULL DEFAULT 1;
