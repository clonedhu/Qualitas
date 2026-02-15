@echo off
chcp 65001 >nul
echo ======================================================
echo  ResilienceAdapter 打包工具
echo ======================================================
echo.

echo [1/6] 檢查 PyInstaller...
.\.venv\Scripts\pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo   未安裝,正在安裝...
    .\.venv\Scripts\pip install pyinstaller
) else (
    echo   ✓ 已安裝
)
echo.

echo [2/6] 清理舊檔案...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist ResilienceAdapter.spec del ResilienceAdapter.spec
echo   ✓ 完成
echo.

echo [3/6] 準備打包...
echo   - 主程式: launch.py
echo   - 模式: 單一 EXE
echo   - 視窗模式: GUI (無主控台)
echo   - 版本資訊: version_info.txt
echo.

echo [4/6] 執行 PyInstaller...
.\.venv\Scripts\pyinstaller ^
    --noconfirm ^
    --onefile ^
    --windowed ^
    --clean ^
    --name "ResilienceAdapter" ^
    --version-file=version_info.txt ^
    --add-data "config;config" ^
    --add-data "assets;assets" ^
    --add-data ".\.venv\Lib\site-packages\customtkinter;customtkinter" ^
    --hidden-import "src.core.browser" ^
    --hidden-import "src.core.adapter" ^
    --hidden-import "src.strategies.stealth" ^
    --hidden-import "src.strategies.entropy" ^
    --hidden-import "src.strategies.trust_tier" ^
    --hidden-import "src.strategies.convergence" ^
    --hidden-import "src.strategies.anchor" ^
    --hidden-import "src.ui.console" ^
    --hidden-import "PIL" ^
    --hidden-import "PIL._tkinter_finder" ^
    --collect-all customtkinter ^
    --collect-all PIL ^
    --collect-all playwright ^
    launch.py

if errorlevel 1 (
    echo.
    echo ❌ 打包失敗!
    echo 請檢查上方錯誤訊息
    pause
    exit /b 1
)
echo.

echo [5/6] 驗證輸出...
if exist "dist\ResilienceAdapter.exe" (
    echo   ✓ EXE 檔案已生成
    for %%A in ("dist\ResilienceAdapter.exe") do (
        set filesize=%%~zA
    )
    setlocal enabledelayedexpansion
    echo   檔案大小: !filesize! bytes
    endlocal
) else (
    echo   ❌ 找不到 EXE 檔案!
    pause
    exit /b 1
)
echo.

echo [6/6] 上傳到 VirusTotal 檢測(可選)...
echo   訪問: https://www.virustotal.com/
echo   上傳: dist\ResilienceAdapter.exe
echo.

echo ======================================================
echo  ✓✓✓ 打包完成! ✓✓✓
echo ======================================================
echo.
echo 輸出位置: %CD%\dist\ResilienceAdapter.exe
echo.
echo 後續步驟:
echo   1. 執行 defender_whitelist.ps1 (管理員) 加入白名單
echo   2. 測試 dist\ResilienceAdapter.exe 是否正常運作
echo   3. (可選) 上傳到 VirusTotal 檢查偵測率
echo.
echo 如果遇到 Windows Defender 阻擋:
echo   參考 README_DEFENDER.md 的處理方法
echo.
pause
