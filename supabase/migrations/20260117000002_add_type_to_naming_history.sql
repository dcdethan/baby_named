-- 为 naming_history 表添加 type 字段，区分起名记录和分析记录
ALTER TABLE public.naming_history ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'naming';

-- 创建 type 索引
CREATE INDEX IF NOT EXISTS idx_naming_history_type ON public.naming_history(type);

-- 添加注释
COMMENT ON COLUMN public.naming_history.type IS '记录类型：naming-起名记录，analysis-分析记录';
