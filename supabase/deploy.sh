#!/bin/bash
# Supabase Edge Function 部署脚本

set -e

echo "========================================="
echo "  Supabase Edge Function 部署脚本"
echo "========================================="

# 检查是否已登录
echo ""
echo "[1/5] 检查 Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "错误: 未安装 Supabase CLI"
    echo "请运行: npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI 已安装"

# 检查是否已关联项目
echo ""
echo "[2/5] 检查项目关联..."
if [ ! -f .git/config ] || ! grep -q "supabase" .git/config; then
    echo "正在关联项目..."
    supabase link --project-ref yfznrctxzdugwbpvlffk
fi

echo "✓ 项目已关联"

# 推送数据库迁移
echo ""
echo "[3/5] 推送数据库迁移..."
read -p "是否推送数据库迁移? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase db push
    echo "✓ 数据库迁移完成"
else
    echo "⊘ 跳过数据库迁移"
fi

# 设置环境变量
echo ""
echo "[4/5] 设置环境变量..."
read -p "是否设置环境变量? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f .env ]; then
        source .env
        echo "正在设置 DEEPSEEK_API_KEY..."
        supabase secrets set DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"

        echo "正在设置 SUPABASE_SERVICE_ROLE_KEY..."
        supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

        echo "✓ 环境变量设置完成"
    else
        echo "错误: 未找到 .env 文件"
        echo "请复制 .env.example 为 .env 并填入真实密钥"
        exit 1
    fi
else
    echo "⊘ 跳过环境变量设置"
fi

# 部署 Edge Function
echo ""
echo "[5/5] 部署 Edge Function..."
supabase functions deploy naming-expert

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "函数 URL:"
echo "https://yfznrctxzdugwbpvlffk.supabase.co/functions/v1/naming-expert"
echo ""
echo "查看日志:"
echo "https://supabase.com/dashboard/project/yfznrctxzdugwbpvlffk/functions/naming-expert/logs"
echo ""
