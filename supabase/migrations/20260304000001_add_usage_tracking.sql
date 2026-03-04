-- Migration: 添加请求次数追踪表

CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openid VARCHAR(64) NOT NULL UNIQUE,
  naming_count INTEGER DEFAULT 0 NOT NULL,
  analysis_count INTEGER DEFAULT 0 NOT NULL,
  library_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_usage_openid ON user_usage(openid);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_usage"
  ON user_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
