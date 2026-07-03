# SoloCRM Installation Script (Windows)
# Usage: .\install.ps1 [install_dir]

param(
    [string]$InstallDir = "$env:USERPROFILE\.agents\skills\solocrm"
)

$RepoUrl = "https://github.com/your-username/solocrm.git"

Write-Host "Installing SoloCRM to $InstallDir..." -ForegroundColor Cyan

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
Write-Host "Verifying installation..." -ForegroundColor Yellow
$version = node solo.js --version
Write-Host "SoloCRM $version installed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "Usage: node $InstallDir\solo.js <command>" -ForegroundColor Cyan
