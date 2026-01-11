-- 创建收藏表
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('naming', 'analysis')),
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_type ON public.favorites(type);
CREATE INDEX idx_favorites_created_at ON public.favorites(created_at DESC);

-- 防止重复收藏（同一用户、同一类型、同一内容）
CREATE UNIQUE INDEX idx_favorites_unique ON public.favorites(user_id, type, md5(content::text));

-- 设置 RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 允许服务端操作
CREATE POLICY "允许服务端操作" ON public.favorites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 添加注释
COMMENT ON TABLE public.favorites IS '用户收藏表';
COMMENT ON COLUMN public.favorites.id IS '收藏ID';
COMMENT ON COLUMN public.favorites.user_id IS '用户ID';
COMMENT ON COLUMN public.favorites.type IS '收藏类型: naming-起名结果, analysis-分析结果';
COMMENT ON COLUMN public.favorites.content IS '收藏内容(JSON)';
COMMENT ON COLUMN public.favorites.created_at IS '收藏时间';
