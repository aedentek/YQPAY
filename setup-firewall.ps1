# Script to add Windows Firewall rules for Node.js development servers
# This allows mobile devices on the same WiFi to access your backend and frontend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Windows Firewall Setup for QR Scanning" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "`nPlease run PowerShell as Administrator and try again:" -ForegroundColor Yellow
    Write-Host "   1. Right-click PowerShell" -ForegroundColor Gray
    Write-Host "   2. Select 'Run as Administrator'" -ForegroundColor Gray
    Write-Host "   3. Navigate to: cd D:\9" -ForegroundColor Gray
    Write-Host "   4. Run: .\setup-firewall.ps1`n" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Running with Administrator privileges`n" -ForegroundColor Green

# Remove existing rules (if any)
Write-Host "🧹 Removing old firewall rules (if they exist)..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "YQPayNow - Backend Server" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "YQPayNow - Frontend Server" -ErrorAction SilentlyContinue

# Add Backend Port 5000
Write-Host "➕ Adding firewall rule for Backend (Port 5000)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "YQPayNow - Backend Server" `
    -Direction Inbound `
    -LocalPort 5000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allows mobile devices to access YQPayNow backend API for QR code scanning"

# Add Frontend Port 3001
Write-Host "➕ Adding firewall rule for Frontend (Port 3001)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "YQPayNow - Frontend Server" `
    -Direction Inbound `
    -LocalPort 3001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allows mobile devices to access YQPayNow frontend for QR code scanning"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ Firewall Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Get network IP
$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual'} | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object -First 1).IPAddress

if ($networkIP) {
    Write-Host "`n📱 Your Network IP: $networkIP" -ForegroundColor Cyan
    Write-Host "`nMobile devices on the same WiFi can now access:" -ForegroundColor White
    Write-Host "   Frontend: http://${networkIP}:3001" -ForegroundColor Green
    Write-Host "   Backend:  http://${networkIP}:5000" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Could not detect network IP. Make sure you're connected to WiFi." -ForegroundColor Yellow
}

Write-Host "`n💡 To remove these rules later, run:" -ForegroundColor Gray
Write-Host "   Remove-NetFirewallRule -DisplayName 'YQPayNow - Backend Server'" -ForegroundColor DarkGray
Write-Host "   Remove-NetFirewallRule -DisplayName 'YQPayNow - Frontend Server'`n" -ForegroundColor DarkGray
