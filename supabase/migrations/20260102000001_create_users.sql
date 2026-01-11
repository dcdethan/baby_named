-- 创建用户表（存储微信用户信息）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(64) UNIQUE NOT NULL,
  nickname VARCHAR(64),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE UNIQUE INDEX idx_users_openid ON public.users(openid);

-- 设置 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 允许通过云函数插入和更新
CREATE POLICY "允许服务端操作" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 添加注释
COMMENT ON TABLE public.users IS '微信用户表';
COMMENT ON COLUMN public.users.id IS '用户ID';
COMMENT ON COLUMN public.users.openid IS '微信openid';
COMMENT ON COLUMN public.users.nickname IS '昵称';
COMMENT ON COLUMN public.users.avatar_url IS '头像URL';
COMMENT ON COLUMN public.users.created_at IS '创建时间';
COMMENT ON COLUMN public.users.updated_at IS '更新时间';
