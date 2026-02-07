@echo off
cd /d "%~dp0"
echo 正在啟動 Qualitas 開發伺服器...
echo.

echo 啟動 Python 後端 (port 8000, ITP 等)...
start "Python 後端" cmd /k "cd /d %~dp0backend && echo Python 後端運行在 http://localhost:8000 && python -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo 啟動 Node 後端 (port 3001)...
start "Node 後端" cmd /k "cd /d %~dp0backend && echo Node 後端運行在 http://localhost:3001 && npm start"

timeout /t 2 /nobreak >nul

echo 啟動前端伺服器 (port 3000)...
start "前端伺服器" cmd /k "cd /d %~dp0react-app && echo 前端伺服器運行在 http://localhost:3000 && npm run dev"

echo.
echo 伺服器正在啟動中...
echo 請稍候幾秒後訪問: http://localhost:3000
echo.
pause
