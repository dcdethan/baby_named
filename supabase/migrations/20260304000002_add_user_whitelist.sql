-- Migration: 添加用户白名单表
-- 白名单用户不受免费次数限制，由开发者手动维护

CREATE TABLE IF NOT EXISTS user_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openid VARCHAR(64) NOT NULL UNIQUE,
  note TEXT,  -- 备注（如：联系人、解锁时间等）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_whitelist_openid ON user_whitelist(openid);

ALTER TABLE user_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_whitelist"
  ON user_whitelist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 使用示例（开发者在 Supabase 控制台执行）：
-- INSERT INTO user_whitelist (openid, note) VALUES ('用户的openid', '已联系，手动解锁');
