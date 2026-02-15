Write-Host "Killing all Edge processes..." -ForegroundColor Yellow
Stop-Process -Name "msedge" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

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
    Write-Host "Edge executable not found!" -ForegroundColor Red
    exit
}

$userDataDir = "C:\selenium\EdgeProfile"
$debugPort = 9222

Write-Host "Launching Edge with remote debugging on port $debugPort..." -ForegroundColor Green
Start-Process -FilePath $edgePath -ArgumentList "--remote-debugging-port=$debugPort", "--user-data-dir=$userDataDir"

Start-Sleep -Seconds 3

Write-Host "Checking if port is open..."
$url = "http://127.0.0.1:$debugPort/json/version"
try {
    $response = Invoke-RestMethod -Uri $url -ErrorAction Stop
    Write-Host "SUCCESS! Edge is listening on port $debugPort." -ForegroundColor Cyan
    Write-Host "WebSocket Debug URL: $($response.webSocketDebuggerUrl)" -ForegroundColor Gray
}
catch {
    Write-Host "FAILURE! Port $debugPort is CLOSED." -ForegroundColor Red
}
