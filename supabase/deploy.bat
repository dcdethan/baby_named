@echo off
REM Supabase Edge Function 部署脚本 (Windows)

echo =========================================
echo   Supabase Edge Function 部署脚本
echo =========================================

REM 检查 Supabase CLI
echo.
echo [1/5] 检查 Supabase CLI...
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未安装 Supabase CLI
    echo 请运行: npm install -g supabase
    exit /b 1
)
echo √ Supabase CLI 已安装

REM 关联项目
echo.
echo [2/5] 关联项目...
supabase link --project-ref yfznrctxzdugwbpvlffk
if %ERRORLEVEL% NEQ 0 (
    echo 警告: 项目关联可能失败，继续...
)
echo √ 项目已关联

REM 推送数据库迁移
echo.
echo [3/5] 推送数据库迁移...
set /p MIGRATE="是否推送数据库迁移? (y/n): "
if /i "%MIGRATE%"=="y" (
    supabase db push
    echo √ 数据库迁移完成
) else (
    echo ⊘ 跳过数据库迁移
)

REM 设置环境变量
echo.
echo [4/5] 设置环境变量...
set /p SETENV="是否设置环境变量? (y/n): "
if /i "%SETENV%"=="y" (
    if exist .env (
        echo 请手动运行以下命令设置环境变量:
        echo.
        echo supabase secrets set DEEPSEEK_API_KEY=你的DeepSeek密钥
        echo supabase secrets set SUPABASE_SERVICE_ROLE_KEY=你的Supabase服务密钥
        echo.
        pause
    ) else (
        echo 错误: 未找到 .env 文件
        echo 请复制 .env.example 为 .env 并填入真实密钥
        exit /b 1
    )
) else (
    echo ⊘ 跳过环境变量设置
)

REM 部署 Edge Function
echo.
echo [5/5] 部署 Edge Function...
supabase functions deploy naming-expert

echo.
echo =========================================
echo   部署完成！
echo =========================================
echo.
echo 函数 URL:
echo https://yfznrctxzdugwbpvlffk.supabase.co/functions/v1/naming-expert
echo.
echo 查看日志:
echo https://supabase.com/dashboard/project/yfznrctxzdugwbpvlffk/functions/naming-expert/logs
echo.
pause
