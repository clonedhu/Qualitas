Write-Host "Killing all Chrome processes..." -ForegroundColor Yellow
Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userDataDir = "C:\selenium\ChromeProfile"
$debugPort = 9222

Write-Host "Launching Chrome with remote debugging on port $debugPort..." -ForegroundColor Green
Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=$debugPort", "--user-data-dir=$userDataDir"

Start-Sleep -Seconds 3

Write-Host "Checking if port is open..."
$url = "http://127.0.0.1:$debugPort/json/version"
try {
    $response = Invoke-RestMethod -Uri $url -ErrorAction Stop
    Write-Host "SUCCESS! Chrome is listening on port $debugPort." -ForegroundColor Cyan
    Write-Host "WebSocket Debug URL: $($response.webSocketDebuggerUrl)" -ForegroundColor Gray
} catch {
    Write-Host "FAILURE! Port $debugPort is arguably CLOSED." -ForegroundColor Red
    Write-Host "Please check if Chrome launched correctly."
}
