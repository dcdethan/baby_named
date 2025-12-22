# AI 智能起名微信小程序

基于 Supabase + DeepSeek 的 AI 智能起名小程序，结合八字五行与中华文学为宝宝起名。

## 功能特性

- **智能起名**：基于八字五行 + 中文文学语义生成名字
- **多种风格**：支持诗经、楚辞、现代、生肖等起名风格
- **寓意解释**：每个名字都有详细的寓意说明
- **八字分析**：自动计算农历八字信息

## 技术栈

- **前端**：微信小程序（TypeScript）
- **后端**：Supabase Edge Functions（Deno）
- **AI**：DeepSeek Chat API
- **数据库**：Supabase PostgreSQL

## 项目结构

```
miniprogram/
├── pages/              # 页面目录
│   ├── index/         # 起名输入页面
│   └── result/        # 结果展示页面
├── utils/             # 工具类
│   └── supabase.ts    # Supabase 客户端
├── config/            # 配置文件
│   └── supabase.ts    # Supabase 配置
├── types/             # 类型定义
│   └── index.ts       # TypeScript 类型
├── app.ts             # 小程序入口
├── app.json           # 小程序配置
├── app.wxss           # 全局样式
└── package.json       # 依赖管理
```

## 快速开始

### 1. 安装依赖

```bash
cd miniprogram
npm install
```

### 2. 配置 Supabase

配置文件位于 `config/supabase.ts`，已包含：

- Supabase URL
- Supabase Anon Key

### 3. 开发调试

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 在微信开发者工具中点击"编译"
3. 在模拟器中测试小程序

### 4. 构建 TypeScript

```bash
npm run tsc
```

## 后端部署

后端 Edge Function 需要单独部署到 Supabase，详见设计文档中的后端配置部分。

### 环境变量

后端 Edge Function 需要配置以下环境变量：

- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase Service Role Key

## 安全说明

- 前端只使用 Supabase Anon Key
- DeepSeek API Key 仅在后端使用
- 所有敏感操作通过 Edge Function 完成

## 使用流程

1. 用户输入父姓、母姓（可选）、生日、性别
2. 选择起名风格（诗经/楚辞/现代/生肖）
3. 点击"开始起名"提交表单
4. 后端计算八字五行，调用 AI 生成名字
5. 展示 4-6 个名字及寓意说明

## 开发注意事项

1. 微信小程序不支持完整的 Node.js 环境，部分 npm 包可能无法使用
2. 需要在微信开发者工具中构建 npm 依赖
3. TypeScript 编译后才能在小程序中运行

## License

MIT
