#!/bin/bash
# SoloCRM Installation Script
# Usage: bash install.sh [install_dir]

set -e

INSTALL_DIR="${1:-$HOME/.agents/skills/solocrm}"
REPO_URL="https://github.com/your-username/solocrm.git"

echo "Installing SoloCRM to $INSTALL_DIR..."

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
echo "Verifying installation..."
node solo.js --version

echo ""
echo "Installation complete!"
echo "Usage: node $INSTALL_DIR/solo.js <command>"
