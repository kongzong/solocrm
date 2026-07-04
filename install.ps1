# SoloCRM Installation Script (Windows)
# Usage: .\install.ps1 [install_dir]

param(
    [string]$InstallDir = ""
)

$RepoUrl = "https://github.com/kongzong/solocrm.git"

Write-Host "=== SoloCRM Installer ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select installation directory:" -ForegroundColor Cyan
Write-Host "  1) $env:USERPROFILE\.claude\skills\solocrm (Claude)"
Write-Host "  2) $env:USERPROFILE\.agents\skills\solocrm (opencode/others)"
Write-Host "  3) Custom path"
Write-Host ""

# If argument provided, skip interactive
if ($InstallDir -eq "") {
    $choice = Read-Host "Enter choice [1-3]"
    
    switch ($choice) {
        "1" { $InstallDir = "$env:USERPROFILE\.claude\skills\solocrm" }
        "2" { $InstallDir = "$env:USERPROFILE\.agents\skills\solocrm" }
        "3" { $InstallDir = Read-Host "Enter installation path" }
        default {
            Write-Host "Invalid choice. Using default." -ForegroundColor Yellow
            $InstallDir = "$env:USERPROFILE\.agents\skills\solocrm"
        }
    }
}

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
