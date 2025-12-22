#!/bin/bash
# 测试 naming-expert Edge Function

echo "========================================="
echo "  测试 naming-expert Edge Function"
echo "========================================="

# 获取 Anon Key
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmem5yY3R4emR1Z3dicHZsZmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NzYyNzEsImV4cCI6MjA1MDI1MjI3MX0.sb_publishable_6RHnO6Ip_QyhM7uremQMmg_yjvA1omB"

# 测试数据
TEST_DATA='{
  "fatherSurname": "张",
  "motherSurname": "李",
  "birthday": "2024-01-15",
  "gender": "male",
  "style": "shijing"
}'

echo ""
echo "测试数据:"
echo "$TEST_DATA" | jq .

echo ""
echo "发送请求..."
echo ""

# 调用生产环境
curl -i --location --request POST \
  'https://yfznrctxzdugwbpvlffk.supabase.co/functions/v1/naming-expert' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data "$TEST_DATA"

echo ""
echo ""
echo "========================================="
echo "  测试完成"
echo "========================================="
