@echo off
chcp 65001 >nul
echo ======================================================
echo  GemGPT 一鍵啟動
echo ======================================================
echo.

echo [1/2] 啟動瀏覽器環境 (Edge)...
start msedge.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\EdgeDebugProfile" "https://gemini.google.com" "https://chatgpt.com"

echo   等待瀏覽器啟動...
timeout /t 3 /nobreak >nul

echo [2/2] 啟動 GemGPT...
cd /d "%~dp0"
if exist "ResilienceAdapter.exe" (
    start ResilienceAdapter.exe
) else if exist "dist\ResilienceAdapter.exe" (
    start dist\ResilienceAdapter.exe
) else (
    echo ❌ 找不到 ResilienceAdapter.exe
    pause
)

echo.
echo ✅ 啟動完成! 請在瀏覽器中登入帳號。
echo 此視窗將在 5 秒後關閉...
timeout /t 5 >nul
exit
