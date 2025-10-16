# Script to switch between localhost and network IP for QR scanning
param(
    [string]$mode = "localhost"  # Options: "localhost" or "network"
)

$frontendEnv = "frontend\.env"
$backendEnv = "backend\.env"

# Get current network IP
$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress

Write-Host "Current Network IP: $networkIP" -ForegroundColor Cyan

if ($mode -eq "network") {
    Write-Host "`nSwitching to NETWORK mode for mobile QR scanning..." -ForegroundColor Yellow
    
    # Update frontend .env
    $frontendContent = @"
REACT_APP_API_URL=http://${networkIP}:5000/api
REACT_APP_BACKEND_URL=http://${networkIP}:5000
PORT=3001

# For local testing only:
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_BACKEND_URL=http://localhost:5000
"@
    
    # Update backend .env
    $backendContent = Get-Content $backendEnv -Raw
    $backendContent = $backendContent -replace 'FRONTEND_URL=http://localhost:3001', "FRONTEND_URL=http://${networkIP}:3001"
    
    Set-Content -Path $frontendEnv -Value $frontendContent -NoNewline
    Set-Content -Path $backendEnv -Value $backendContent -NoNewline
    
    Write-Host "✅ Network mode enabled!" -ForegroundColor Green
    Write-Host "   Frontend: http://${networkIP}:3001" -ForegroundColor Cyan
    Write-Host "   Backend:  http://${networkIP}:5000" -ForegroundColor Cyan
    Write-Host "`n⚠️  Make sure Windows Firewall allows Node.js on ports 3001 and 5000!" -ForegroundColor Yellow
    Write-Host "   Run: New-NetFirewallRule -DisplayName 'Node.js Dev Server' -Direction Inbound -LocalPort 3001,5000 -Protocol TCP -Action Allow" -ForegroundColor Gray
    
} else {
    Write-Host "`nSwitching to LOCALHOST mode..." -ForegroundColor Yellow
    
    # Update frontend .env
    $frontendContent = @"
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000
PORT=3001

# For mobile QR code scanning, change to your network IP:
# REACT_APP_API_URL=http://${networkIP}:5000/api
# REACT_APP_BACKEND_URL=http://${networkIP}:5000
"@
    
    # Update backend .env
    $backendContent = Get-Content $backendEnv -Raw
    $backendContent = $backendContent -replace "FRONTEND_URL=http://${networkIP}:3001", 'FRONTEND_URL=http://localhost:3001'
    
    Set-Content -Path $frontendEnv -Value $frontendContent -NoNewline
    Set-Content -Path $backendEnv -Value $backendContent -NoNewline
    
    Write-Host "✅ Localhost mode enabled!" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Cyan
}

Write-Host "`n🔄 Restart both servers for changes to take effect!" -ForegroundColor Magenta
Write-Host "   Backend: cd backend ; node app.js" -ForegroundColor Gray
Write-Host "   Frontend: cd frontend ; npm start" -ForegroundColor Gray
