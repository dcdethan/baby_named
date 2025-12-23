# 项目完整结构

```
D:\code/
│
├── README.md                          # 项目总览文档
├── PROJECT_STRUCTURE.md               # 本文件：项目结构说明
│
├── miniprogram/                       # 微信小程序前端
│   ├── README.md                      # 前端文档
│   ├── package.json                   # 前端依赖
│   ├── tsconfig.json                  # TypeScript 配置
│   ├── project.config.json            # 小程序项目配置
│   ├── .gitignore                     # Git 忽略文件
│   │
│   ├── app.ts                         # 小程序入口逻辑
│   ├── app.json                       # 小程序全局配置
│   ├── app.wxss                       # 小程序全局样式
│   ├── sitemap.json                   # 小程序索引配置
│   │
│   ├── config/                        # 配置目录
│   │   └── supabase.ts               # Supabase 配置（URL + Anon Key）
│   │
│   ├── utils/                         # 工具类目录
│   │   └── supabase.ts               # Supabase 客户端封装
│   │
│   ├── types/                         # TypeScript 类型定义
│   │   └── index.ts                  # 核心类型定义
│   │
│   └── pages/                         # 页面目录
│       ├── index/                     # 起名输入页面
│       │   ├── index.wxml            # 页面结构
│       │   ├── index.wxss            # 页面样式
│       │   ├── index.ts              # 页面逻辑
│       │   └── index.json            # 页面配置
│       │
│       └── result/                    # 结果展示页面
│           ├── result.wxml           # 页面结构
│           ├── result.wxss           # 页面样式
│           ├── result.ts             # 页面逻辑
│           └── result.json           # 页面配置
│
└── supabase/                          # Supabase 后端
    ├── README.md                      # 后端文档
    ├── config.toml                    # Supabase 项目配置
    ├── .env.example                   # 环境变量模板
    ├── .gitignore                     # Git 忽略文件
    │
    ├── deploy.sh                      # 部署脚本 (Unix/Mac)
    ├── deploy.bat                     # 部署脚本 (Windows)
    ├── test-function.sh               # 测试脚本 (Unix/Mac)
    ├── test-function.bat              # 测试脚本 (Windows)
    │
    ├── functions/                     # Edge Functions 目录
    │   └── naming-expert/             # 起名专家函数
    │       └── index.ts              # 函数主文件
    │
    └── migrations/                    # 数据库迁移目录
        └── 20231220000000_create_naming_history.sql  # 创建表
```

## 文件说明

### 前端核心文件

| 文件路径 | 说明 | 关键点 |
|---------|------|--------|
| `miniprogram/app.ts` | 小程序入口 | 全局生命周期 |
| `miniprogram/config/supabase.ts` | Supabase 配置 | URL + Anon Key |
| `miniprogram/utils/supabase.ts` | Supabase 客户端 | Edge Function 调用 |
| `miniprogram/types/index.ts` | 类型定义 | 接口、枚举 |
| `miniprogram/pages/index/index.ts` | 输入页面逻辑 | 表单处理 |
| `miniprogram/pages/result/result.ts` | 结果页面逻辑 | 结果展示 |

### 后端核心文件

| 文件路径 | 说明 | 关键点 |
|---------|------|--------|
| `supabase/functions/naming-expert/index.ts` | Edge Function | 核心业务逻辑 |
| `supabase/migrations/*.sql` | 数据库迁移 | 表结构定义 |
| `supabase/config.toml` | Supabase 配置 | 项目设置 |
| `supabase/.env.example` | 环境变量模板 | 密钥配置 |
| `supabase/deploy.sh` | 部署脚本 | 自动化部署 |

## 技术栈对应

### 前端技术

```
微信小程序 (WXML + WXSS + TypeScript)
    ↓
@supabase/supabase-js (调用后端)
    ↓
Supabase Edge Function
```

### 后端技术

```
Deno Runtime (Edge Function 运行环境)
    ↓
lunar-typescript (八字计算)
    ↓
DeepSeek API (AI 生成)
    ↓
PostgreSQL (数据存储)
```

## 数据流向

### 1. 用户输入 → 提交请求

```
pages/index/index.ts
    → utils/supabase.ts (invokeEdgeFunction)
    → Supabase Edge Function
```

### 2. 后端处理

```
functions/naming-expert/index.ts
    → calculateBazi() [计算八字]
    → buildPrompt() [构造 Prompt]
    → callDeepSeek() [调用 AI]
    → saveToDatabase() [存储结果]
    → 返回 JSON
```

### 3. 展示结果

```
Edge Function 响应
    → pages/index/index.ts (接收)
    → 跳转到 pages/result/result
    → 展示名字列表
```

## 配置项说明

### 前端配置 (miniprogram/config/supabase.ts)

```typescript
SUPABASE_URL = "https://yfznrctxzdugwbpvlffk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGci..."
```

**用途**: 前端调用 Supabase API

### 后端配置 (supabase/.env)

```bash
DEEPSEEK_API_KEY="sk-..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
SUPABASE_URL="https://yfznrctxzdugwbpvlffk.supabase.co"
```

**用途**: 后端 Edge Function 环境变量

## 部署流程

### 前端部署

1. 用微信开发者工具打开 `miniprogram/` 目录
2. 构建 npm: 工具 → 构建 npm
3. 预览/上传

### 后端部署

1. 配置环境变量: `cp .env.example .env`
2. 运行部署脚本: `./deploy.sh` (Unix) 或 `deploy.bat` (Windows)
3. 验证部署: `./test-function.sh` 或 `test-function.bat`

## 开发建议

### 前端开发

1. 先修改 UI（wxml + wxss）
2. 再完善逻辑（ts）
3. 使用微信开发者工具实时预览

### 后端开发

1. 本地测试: `supabase functions serve naming-expert --env-file .env`
2. 本地调用: 使用 `test-function.sh` 测试
3. 部署到生产: `supabase functions deploy naming-expert`

## 常用命令

### 前端

```bash
cd miniprogram
npm install              # 安装依赖
npm run tsc             # 编译 TypeScript
```

### 后端

```bash
cd supabase
supabase login          # 登录
supabase link           # 关联项目
supabase db push        # 推送迁移
supabase functions deploy naming-expert  # 部署函数
supabase secrets list   # 查看密钥
```

## 安全注意事项

### ✅ 可以提交到 Git

- `miniprogram/config/supabase.ts` (Anon Key 是公开的)
- 所有代码文件
- 配置模板 (`.env.example`)

### ❌ 不能提交到 Git

- `supabase/.env` (包含私钥)
- `node_modules/`
- 编译产物

## 目录权限

| 目录 | 前端访问 | 后端访问 |
|------|---------|---------|
| `miniprogram/` | ✅ | ❌ |
| `supabase/functions/` | ❌ | ✅ |
| Supabase Database | ✅ (RLS) | ✅ (Full) |

---

**更新时间**: 2024-12-20
