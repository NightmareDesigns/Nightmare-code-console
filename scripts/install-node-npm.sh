#!/usr/bin/env bash
# Lightweight helper to install Node.js (includes npm) on new machines.
# Usage:  bash scripts/install-node-npm.sh

set -euo pipefail

if command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  echo "✅ npm and node already installed: npm $(npm -v), node $(node -v)"
  exit 0
fi

echo "ℹ️ npm/node not found — installing via nvm (Node Version Manager)..."

# Detect a download tool
if command -v curl >/dev/null 2>&1; then
  DL="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  DL="wget -qO-"
else
  echo "❌ Neither curl nor wget is available. Please install one of them first." >&2
  exit 1
fi

# Install nvm (https://github.com/nvm-sh/nvm)
export NVM_DIR="${HOME}/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  eval "$($DL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh)"
else
  echo "ℹ️ nvm already present at $NVM_DIR"
fi

# Load nvm into the current shell
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
else
  echo "❌ Could not load nvm from $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# Install and use the project baseline Node version (18 LTS+)
TARGET_NODE_VERSION="${NODE_VERSION:-18}"
echo "➡️ Installing Node.js ${TARGET_NODE_VERSION} (includes npm)..."
nvm install "$TARGET_NODE_VERSION"
nvm use "$TARGET_NODE_VERSION"

echo "✅ Installed node $(node -v) with npm $(npm -v)"
echo "Next: run 'npm install' in the repo root."
