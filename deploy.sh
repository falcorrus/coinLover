#!/bin/bash

# Configuration
REMOTE_USER="root"
REMOTE_HOST="server.reloto.ru"
REMOTE_DIR="/root/MyProjects/coinLover"
REPO_URL="https://github.com/falcorrus/coinLover.git"

echo "🚀 Starting deployment to $REMOTE_HOST..."

# 1. Ensure directory exists and pull latest changes
ssh $REMOTE_USER@$REMOTE_HOST << EOF
  if [ ! -d "$REMOTE_DIR" ]; then
    mkdir -p /root/MyProjects
    cd /root/MyProjects
    git clone $REPO_URL
  fi
  cd $REMOTE_DIR
  git pull origin main
  
  # 2. Rebuild and restart containers
  docker compose up -d --build
EOF

echo "✅ Deployment finished!"
