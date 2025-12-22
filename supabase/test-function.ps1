# PowerShell 测试脚本 - 测试 naming-expert Edge Function

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  测试 naming-expert Edge Function" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmem5yY3R4emR1Z3dicHZsZmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NzYyNzEsImV4cCI6MjA1MDI1MjI3MX0.sb_publishable_6RHnO6Ip_QyhM7uremQMmg_yjvA1omB"
$URL = "https://yfznrctxzdugwbpvlffk.supabase.co/functions/v1/naming-expert"

# 测试数据
$body = @{
    fatherSurname = "张"
    motherSurname = "李"
    birthday = "2024-01-15"
    gender = "male"
    style = "shijing"
} | ConvertTo-Json

Write-Host "测试数据:" -ForegroundColor Yellow
Write-Host $body
Write-Host ""

Write-Host "发送请求..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $URL -Method Post -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  测试成功！" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "返回结果:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "  测试失败！" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "详细信息:" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
