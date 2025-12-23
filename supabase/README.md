# Supabase 后端配置与部署

AI 智能起名小程序的后端服务，基于 Supabase Edge Functions 和 PostgreSQL。

## 目录结构

```
supabase/
├── functions/
│   └── naming-expert/
│       └── index.ts         # 起名专家 Edge Function
├── migrations/
│   └── 20231220000000_create_naming_history.sql  # 数据库迁移
├── config.toml              # Supabase 配置
└── .env.example             # 环境变量模板
```

## 快速开始

### 1. 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (使用 Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 或者使用 npm
npm install -g supabase
```

### 2. 登录 Supabase

```bash
supabase login
```

### 3. 关联项目

```bash
supabase link --project-ref yfznrctxzdugwbpvlffk
```

### 4. 配置环境变量

复制 `.env.example` 为 `.env` 并填入真实密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 从 https://platform.deepseek.com/ 获取
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxx

# 从 Supabase Dashboard -> Settings -> API 获取
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 项目 URL
SUPABASE_URL=https://yfznrctxzdugwbpvlffk.supabase.co
```

### 5. 运行数据库迁移

```bash
supabase db push
```

### 6. 部署 Edge Function

```bash
# 设置环境变量
supabase secrets set DEEPSEEK_API_KEY=your_actual_key_here
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_actual_key_here

# 部署函数
supabase functions deploy naming-expert
```

## 本地开发

### 启动本地 Supabase 服务

```bash
supabase start
```

这将启动：
- PostgreSQL 数据库（端口 54322）
- API 服务器（端口 54321）
- Studio 界面（端口 54323）
- Inbucket 邮件服务（端口 54324）

### 本地运行 Edge Function

```bash
# 使用本地环境变量
supabase functions serve naming-expert --env-file .env
```

### 测试 Edge Function

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/naming-expert' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "fatherSurname": "张",
    "birthday": "2024-01-15",
    "gender": "male",
    "style": "shijing"
  }'
```

## Edge Function 说明

### naming-expert

AI 起名专家函数，负责：

1. **八字计算**：使用 `lunar-typescript` 计算农历、八字、五行
2. **AI 调用**：调用 DeepSeek API 生成名字
3. **数据存储**：将结果保存到 `naming_history` 表
4. **结果返回**：返回结构化的起名结果

#### 请求参数

```typescript
{
  fatherSurname: string     // 父姓（必填）
  motherSurname?: string    // 母姓（可选）
  birthday: string          // 阳历生日 YYYY-MM-DD（必填）
  gender: 'male' | 'female' // 性别（必填）
  style: 'shijing' | 'chuci' | 'modern' | 'zodiac'  // 风格（必填）
}
```

#### 响应格式

```typescript
{
  success: boolean
  data?: {
    names: [
      {
        name: string        // 姓名全称
        pinyin: string      // 拼音
        wuxing: string      // 五行属性
        meaning: string     // 寓意说明
      }
    ],
    bazi: {
      year: string          // 年柱
      month: string         // 月柱
      day: string           // 日柱
      hour: string          // 时柱
    }
  }
  error?: string
}
```

## 数据库表结构

### naming_history

起名历史记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID（未登录可为空） |
| params | jsonb | 请求参数 |
| result | jsonb | AI 生成结果 |
| created_at | timestamp | 创建时间 |

**安全策略（RLS）**：
- 允许匿名插入
- 用户只能查看自己的记录

## 环境变量管理

### 查看已设置的密钥

```bash
supabase secrets list
```

### 设置密钥

```bash
supabase secrets set KEY_NAME=value
```

### 删除密钥

```bash
supabase secrets unset KEY_NAME
```

## 监控与日志

### 查看函数日志

在 Supabase Dashboard：
1. 进入 Functions 页面
2. 选择 `naming-expert`
3. 查看 Logs 标签

### 查看数据库

在 Supabase Dashboard：
1. 进入 Table Editor
2. 选择 `naming_history` 表
3. 查看历史记录

## 常见问题

### 1. Edge Function 调用失败

- 检查环境变量是否正确设置
- 检查 DeepSeek API Key 是否有效
- 查看函数日志排查错误

### 2. 数据库写入失败

- 检查 RLS 策略是否正确
- 检查 Service Role Key 是否有效

### 3. 八字计算错误

- 确保生日格式为 `YYYY-MM-DD`
- 确保日期在合理范围内（1900-2100）

## 成本估算

### Supabase

- 免费套餐包含：
  - 500MB 数据库存储
  - 5GB 文件存储
  - 2GB 流量/月
  - 500K Edge Function 调用/月

### DeepSeek API

- 按 Token 计费
- 预估每次起名消耗：~1000 tokens
- 费用：约 ￥0.001/次

## 安全建议

1. **不要将密钥提交到代码仓库**
2. **使用 RLS 保护数据库**
3. **定期轮换 API 密钥**
4. **监控异常调用**
5. **限制函数调用频率**（可在 Supabase Dashboard 配置）

## 更新日志

- 2024-12-20：初始版本
  - 创建 naming-expert Edge Function
  - 创建 naming_history 数据表
  - 集成 DeepSeek API
  - 实现八字五行计算
