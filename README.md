# AI 智能起名系统

基于 **Supabase + DeepSeek** 的 AI 智能起名微信小程序，结合八字五行与中华文学为宝宝智能推荐名字。

## 项目概述

- **前端**：微信小程序（TypeScript）
- **后端**：Supabase Edge Functions（Deno）
- **AI**：DeepSeek Chat API
- **数据库**：Supabase PostgreSQL

## 目录结构

```
D:\code/
├── miniprogram/              # 微信小程序前端
│   ├── pages/
│   │   ├── index/           # 起名输入页面
│   │   └── result/          # 结果展示页面
│   ├── utils/
│   │   └── supabase.ts      # Supabase 客户端
│   ├── config/
│   │   └── supabase.ts      # 配置文件
│   ├── types/
│   │   └── index.ts         # TypeScript 类型
│   └── package.json
│
└── supabase/                 # Supabase 后端
    ├── functions/
    │   └── naming-expert/   # Edge Function
    ├── migrations/          # 数据库迁移
    ├── config.toml          # Supabase 配置
    ├── deploy.sh            # 部署脚本 (Unix)
    ├── deploy.bat           # 部署脚本 (Windows)
    └── README.md            # 后端文档
```

## 快速开始

### 前端（微信小程序）

详见 [miniprogram/README.md](miniprogram/README.md)

```bash
cd miniprogram
npm install
```

然后用微信开发者工具打开 `miniprogram` 目录。

### 后端（Supabase）

详见 [supabase/README.md](supabase/README.md)

```bash
cd supabase

# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录并关联项目
supabase login
supabase link --project-ref yfznrctxzdugwbpvlffk

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入真实密钥

# 4. 部署
./deploy.sh   # Unix/Mac
# 或
deploy.bat    # Windows
```

## 功能特性

### 🎯 核心功能

- **智能起名**：基于八字五行 + AI 语义生成 4-6 个名字
- **多种风格**：诗经、楚辞、现代、生肖四种风格
- **寓意解释**：每个名字都有详细的寓意说明和文化出处
- **八字分析**：自动计算农历八字、五行分析

### 🔒 安全特性

- **前后端分离**：前端只有公开密钥
- **密钥隔离**：AI 密钥仅在后端使用
- **数据保护**：RLS 行级安全策略
- **匿名支持**：未登录用户也可使用

### 📊 数据存储

- 所有起名记录自动存储
- 支持历史记录查询
- 用于质量优化和模型改进

## 技术架构

### 前端架构

```
用户输入 → 表单验证 → 调用 Edge Function → 展示结果
```

### 后端架构

```
Edge Function 接收请求
    ↓
八字五行计算 (lunar-typescript)
    ↓
构造 AI Prompt
    ↓
调用 DeepSeek API
    ↓
存储到 PostgreSQL
    ↓
返回结构化结果
```

### 数据流

```
小程序 → Supabase Anon Key → Edge Function
                                   ↓
                         DeepSeek API (后端调用)
                                   ↓
                         PostgreSQL (RLS 保护)
```

## 配置说明

### Supabase 配置

| 配置项 | 值 | 用途 |
|--------|-----|------|
| SUPABASE_URL | `https://yfznrctxzdugwbpvlffk.supabase.co` | API 端点 |
| SUPABASE_ANON_KEY | 见 `miniprogram/config/supabase.ts` | 前端公开密钥 |
| SUPABASE_SERVICE_ROLE_KEY | 仅后端 | 后端服务密钥 |

### DeepSeek 配置

| 配置项 | 获取方式 | 用途 |
|--------|----------|------|
| DEEPSEEK_API_KEY | https://platform.deepseek.com/ | AI 调用密钥 |

## API 文档

### Edge Function: naming-expert

**请求 URL**: `https://yfznrctxzdugwbpvlffk.supabase.co/functions/v1/naming-expert`

**请求方法**: `POST`

**请求头**:
```
Content-Type: application/json
Authorization: Bearer YOUR_ANON_KEY
```

**请求体**:
```json
{
  "fatherSurname": "张",
  "motherSurname": "李",
  "birthday": "2024-01-15",
  "gender": "male",
  "style": "shijing"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "names": [
      {
        "name": "张文轩",
        "pinyin": "zhāng wén xuān",
        "wuxing": "火水土",
        "meaning": "文采飞扬，气宇轩昂..."
      }
    ],
    "bazi": {
      "year": "癸卯",
      "month": "乙丑",
      "day": "丁巳",
      "hour": "庚子"
    }
  }
}
```

## 环境要求

### 前端

- Node.js >= 16
- 微信开发者工具
- TypeScript 5.x

### 后端

- Supabase CLI
- DeepSeek API Key
- Supabase 项目账号

## 成本估算

### 免费额度

- **Supabase**：500K Edge Function 调用/月
- **DeepSeek**：按 Token 计费，约 ¥0.001/次

### 预估成本

- 1000 次起名/月：约 ¥1
- 10000 次起名/月：约 ¥10

## 开发进度

- [x] 前端小程序开发
- [x] 后端 Edge Function 开发
- [x] 数据库表结构设计
- [x] DeepSeek API 集成
- [x] 八字五行计算
- [x] 部署脚本编写
- [ ] 小程序上线审核
- [ ] 用户反馈优化

## 常见问题

### 1. 微信小程序找不到依赖？

在微信开发者工具中点击 "工具" → "构建 npm"

### 2. Edge Function 调用失败？

检查环境变量是否正确设置：
```bash
supabase secrets list
```

### 3. 八字计算不准确？

确保生日格式为 `YYYY-MM-DD`，且在 1900-2100 范围内

### 4. AI 生成结果格式错误？

检查 DeepSeek API 返回，可能需要调整 prompt

## 安全建议

1. ✅ 不要将 `.env` 文件提交到 Git
2. ✅ 定期轮换 API 密钥
3. ✅ 监控异常调用和成本
4. ✅ 启用 Supabase 函数调用限流
5. ✅ 定期备份数据库

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## License

MIT License

## 联系方式

- 项目地址: `D:\code`
- Supabase 项目: https://supabase.com/dashboard/project/yfznrctxzdugwbpvlffk

---

**注意**: 本项目仅供学习交流使用，请勿用于商业用途。
