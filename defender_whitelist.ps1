# 需要管理員權限執行 (Run as Administrator)
# 此腳本將 ResilienceAdapter 加入 Windows Defender 排除清單

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Windows Defender 排除設定工具" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 檢查是否以管理員權限執行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ 錯誤: 此腳本需要管理員權限" -ForegroundColor Red
    Write-Host ""
    Write-Host "請以管理員身份執行 PowerShell,然後重新執行此腳本:" -ForegroundColor Yellow
    Write-Host "  1. 按下 Windows 鍵,搜尋 'PowerShell'" -ForegroundColor Yellow
    Write-Host "  2. 右鍵點擊 'Windows PowerShell'" -ForegroundColor Yellow
    Write-Host "  3. 選擇 '以系統管理員身分執行'" -ForegroundColor Yellow
    Write-Host "  4. 執行此腳本" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ 管理員權限確認完成" -ForegroundColor Green
Write-Host ""

# 取得專案路徑
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptPath "dist\ResilienceAdapter.exe"
$projectPath = $scriptPath

Write-Host "即將加入以下路徑到 Windows Defender 排除清單:" -ForegroundColor Yellow
Write-Host "  1. 專案目錄: $projectPath" -ForegroundColor White
Write-Host "  2. EXE 檔案: $exePath" -ForegroundColor White
Write-Host ""

# 詢問使用者確認
$confirmation = Read-Host "是否繼續? (Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "操作已取消" -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "正在設定排除項目..." -ForegroundColor Cyan

try {
    # 加入專案目錄到排除清單
    Write-Host "  [1/2] 加入專案目錄..." -NoNewline
    Add-MpPreference -ExclusionPath $projectPath -ErrorAction Stop
    Write-Host " ✓" -ForegroundColor Green
    
    # 加入 EXE 檔案到排除清單(如果存在)
    if (Test-Path $exePath) {
        Write-Host "  [2/2] 加入 EXE 檔案..." -NoNewline
        Add-MpPreference -ExclusionPath $exePath -ErrorAction Stop
        Write-Host " ✓" -ForegroundColor Green
    }
    else {
        Write-Host "  [2/2] EXE 檔案不存在,跳過" -ForegroundColor Yellow
        Write-Host "        (請在打包完成後重新執行此腳本)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✓✓✓ 設定完成! ✓✓✓" -ForegroundColor Green
    Write-Host ""
    Write-Host "已成功將以下項目加入 Windows Defender 排除清單:" -ForegroundColor Green
    Write-Host "  - $projectPath" -ForegroundColor White
    if (Test-Path $exePath) {
        Write-Host "  - $exePath" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "注意事項:" -ForegroundColor Yellow
    Write-Host "  - 排除項目會一直保留,直到手動移除" -ForegroundColor White
    Write-Host "  - 您可以在「Windows 安全性」→「病毒與威脅防護」→「管理設定」中查看" -ForegroundColor White
    Write-Host ""
    
}
catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ 錯誤: 設定失敗" -ForegroundColor Red
    Write-Host "詳細資訊: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "  - Windows Defender 服務未運行" -ForegroundColor White
    Write-Host "  - 使用第三方防毒軟體(此腳本僅支援 Windows Defender)" -ForegroundColor White
    Write-Host "  - 系統策略禁止修改排除清單" -ForegroundColor White
    Write-Host ""
}

# 顯示當前所有排除項目
Write-Host "當前所有排除項目:" -ForegroundColor Cyan
try {
    $exclusions = Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
    if ($exclusions) {
        foreach ($item in $exclusions) {
            Write-Host "  - $item" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  (無)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  無法讀取排除清單" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
pause
