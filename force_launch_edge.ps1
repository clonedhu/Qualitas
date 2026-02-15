Write-Host "=== FORCE LAUNCH EDGE DIAGNOSTIC ===" -ForegroundColor Cyan

# 1. Kill Edge
Write-Host "1. Killing ALL msedge processes..." -ForegroundColor Yellow
taskkill /F /IM msedge.exe /T 2>$null
Stop-Process -Name "msedge" -Force -ErrorAction SilentlyContinue 2>$null
Start-Sleep -Seconds 2

# Check if any remain
$running = Get-Process "msedge" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "WARNING: Failed to kill all Edge processes. Please manually close them." -ForegroundColor Red
    $running | Select-Object Id, ProcessName
    exit
}
else {
    Write-Host "   Edge killed successfully." -ForegroundColor Green
}

# 2. Find Executable
$edgePaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)
$edgePath = $null
foreach ($path in $edgePaths) {
    if (Test-Path $path) {
        $edgePath = $path
        break
    }
}
if (-not $edgePath) {
    Write-Host "   Edge executable not found!" -ForegroundColor Red
    exit
}

# 3. Launch with TEMP Profile
# Using a unique temp directory to avoid "Sync" restarts
$tempProfile = Join-Path $env:TEMP "EdgeDebugProfile_$(Get-Random)"
Write-Host "2. Launching Edge with TEMP profile..." -ForegroundColor Yellow
Write-Host "   Profile Path: $tempProfile" -ForegroundColor Gray
Write-Host "   Port: 9222" -ForegroundColor Gray

Start-Process -FilePath $edgePath -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=`"$tempProfile`"", "--no-first-run", "--no-default-browser-check"

Write-Host "   Browser launching..." 
Start-Sleep -Seconds 3

# 4. detailed Port Check
Write-Host "3. Checking Port 9222..." -ForegroundColor Yellow
$url = "http://127.0.0.1:9222/json/version"

$maxRetries = 5
for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $response = Invoke-RestMethod -Uri $url -ErrorAction Stop
        Write-Host "   SUCCESS! Connection Established." -ForegroundColor Green
        Write-Host "   WebSocket URL: $($response.webSocketDebuggerUrl)" -ForegroundColor Gray
        
        Write-Host "`n=== INSTRUCTIONS ===" -ForegroundColor Cyan
        Write-Host "1. In the NEW Edge window, log in to Gemini & ChatGPT."
        Write-Host "2. DO NOT CLOSE THIS WINDOW."
        Write-Host "3. Run 'python src/main.py' again."
        exit
    }
    catch {
        Write-Host "   Attempt $($i+1) of $maxRetries : Port not ready yet..."
        Start-Sleep -Seconds 2
    }
}

Write-Host "`nFAILURE: Could not connect to port 9222." -ForegroundColor Red
Write-Host "Possible causes:"
Write-Host "- Firewall blocking port 9222"
Write-Host "- Edge failed to start"
Write-Host "- Corporate policy disabling remote debugging"
