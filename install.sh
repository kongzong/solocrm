#!/bin/bash
# SoloCRM Installation Script
# Usage: bash install.sh [install_dir]

set -e

REPO_URL="https://github.com/kongzong/solocrm.git"

echo "=== SoloCRM Installer ==="
echo ""
echo "Select installation directory:"
echo "  1) ~/.claude/skills/solocrm (Claude)"
echo "  2) ~/.agents/skills/solocrm (opencode/others)"
echo "  3) Custom path"
echo ""

# If argument provided, skip interactive
if [ -n "$1" ]; then
    INSTALL_DIR="$1"
else
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1)
            INSTALL_DIR="$HOME/.claude/skills/solocrm"
            ;;
        2)
            INSTALL_DIR="$HOME/.agents/skills/solocrm"
            ;;
        3)
            read -p "Enter installation path: " INSTALL_DIR
            ;;
        *)
            echo "Invalid choice. Using default."
            INSTALL_DIR="$HOME/.agents/skills/solocrm"
            ;;
    esac
fi

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
