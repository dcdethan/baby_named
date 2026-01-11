-- 为 naming_history 表添加 openid 字段
ALTER TABLE public.naming_history ADD COLUMN IF NOT EXISTS openid VARCHAR(64);

-- 创建 openid 索引
CREATE INDEX IF NOT EXISTS idx_naming_history_openid ON public.naming_history(openid);

-- 添加注释
COMMENT ON COLUMN public.naming_history.openid IS '微信用户openid';
