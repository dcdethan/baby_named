-- 创建起名历史记录表
CREATE TABLE IF NOT EXISTS public.naming_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  params JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_naming_history_user_id ON public.naming_history(user_id);
CREATE INDEX idx_naming_history_created_at ON public.naming_history(created_at DESC);

-- 设置 RLS (Row Level Security)
ALTER TABLE public.naming_history ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入（用于未登录用户）
CREATE POLICY "允许匿名插入" ON public.naming_history
  FOR INSERT
  WITH CHECK (true);

-- 用户只能查看自己的记录
CREATE POLICY "用户查看自己的记录" ON public.naming_history
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 添加注释
COMMENT ON TABLE public.naming_history IS 'AI起名历史记录表';
COMMENT ON COLUMN public.naming_history.id IS '记录ID';
COMMENT ON COLUMN public.naming_history.user_id IS '用户ID（未登录可为空）';
COMMENT ON COLUMN public.naming_history.params IS '起名请求参数';
COMMENT ON COLUMN public.naming_history.result IS 'AI生成的起名结果';
COMMENT ON COLUMN public.naming_history.created_at IS '创建时间';
