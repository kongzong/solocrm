#!/bin/bash
# SoloCRM Installation Script
# Usage: bash install.sh [install_dir]

set -e

REPO_URL="https://github.com/kongzong/solocrm.git"

# Auto-detect skills directory
if [ -d "$HOME/.claude/skills" ]; then
    DEFAULT_DIR="$HOME/.claude/skills/solocrm"
elif [ -d "$HOME/.agents/skills" ]; then
    DEFAULT_DIR="$HOME/.agents/skills/solocrm"
else
    DEFAULT_DIR="$HOME/.agents/skills/solocrm"
fi

INSTALL_DIR="${1:-$DEFAULT_DIR}"

echo "=== SoloCRM Installer ==="
echo ""
echo "Installing to: $INSTALL_DIR"
echo ""

# Create parent directory if needed
mkdir -p "$(dirname "$INSTALL_DIR")"

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory exists, pulling latest..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Verify
echo ""
echo "Verifying installation..."
node solo.js --version

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Installed to: $INSTALL_DIR"
echo ""
echo "If your AI agent uses a different skills directory,"
echo "move this folder there or run with a custom path:"
echo "  bash install.sh /path/to/your/skills/solocrm"
