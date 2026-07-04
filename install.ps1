# SoloCRM Installation Script (Windows)
# Usage: .\install.ps1 [install_dir]

param(
    [string]$InstallDir = ""
)

$RepoUrl = "https://github.com/kongzong/solocrm.git"

# Auto-detect skills directory
if ($InstallDir -eq "") {
    if (Test-Path "$env:USERPROFILE\.claude\skills") {
        $InstallDir = "$env:USERPROFILE\.claude\skills\solocrm"
    } elseif (Test-Path "$env:USERPROFILE\.agents\skills") {
        $InstallDir = "$env:USERPROFILE\.agents\skills\solocrm"
    } else {
        $InstallDir = "$env:USERPROFILE\.agents\skills\solocrm"
    }
}

Write-Host "=== SoloCRM Installer ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installing to: $InstallDir" -ForegroundColor Cyan
Write-Host ""

# Create parent directory if needed
$ParentDir = Split-Path $InstallDir -Parent
if (!(Test-Path $ParentDir)) {
    New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
}

# Clone or update
if (Test-Path $InstallDir) {
    Write-Host "Directory exists, pulling latest..." -ForegroundColor Yellow
    Set-Location $InstallDir
    git pull
} else {
    Write-Host "Cloning repository..." -ForegroundColor Yellow
    git clone $RepoUrl $InstallDir
    Set-Location $InstallDir
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --production

# Verify
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
$version = node solo.js --version

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Installed to: $InstallDir" -ForegroundColor Green
Write-Host ""
Write-Host "If your AI agent uses a different skills directory," -ForegroundColor Yellow
Write-Host "move this folder there or run with a custom path:" -ForegroundColor Yellow
Write-Host "  .\install.ps1 'C:\path\to\your\skills\solocrm'" -ForegroundColor Yellow
