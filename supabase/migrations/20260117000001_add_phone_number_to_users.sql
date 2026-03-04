-- 添加手机号字段到用户表
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- 创建手机号索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);

-- 添加注释
COMMENT ON COLUMN public.users.phone_number IS '用户手机号';
