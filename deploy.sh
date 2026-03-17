#!/bin/bash

# Configuration
REMOTE_USER="root"
REMOTE_HOST="server.reloto.ru"
REPO_URL="https://github.com/falcorrus/coinLover.git"

# Define Environments
# Format: NAME|DIR|BRANCH|PORT_FRONT|PORT_BACK|CONTAINER_PREFIX
ENV_MAIN="main|/root/MyProjects/coinLover|main|8010|8002|coinlover"
ENV_DEV="dev|/root/MyProjects/coinlover-dev|preview|8011|8001|dev-coinlover"

# 1. Local Checks
echo "🔍 Running local checks..."

echo "Checking Frontend Types (tsc)..."
npm run lint || { echo "❌ Lint failed! Deployment aborted."; exit 1; }

echo "Checking Frontend Build (vite build)..."
npm run build || { echo "❌ Build failed! Deployment aborted."; exit 1; }

# echo "Checking Backend Logic (test_api.py)..."
# PYTHONPATH=./backend python3 backend/test_api.py || { echo "❌ Backend test failed! Deployment aborted."; exit 1; }

# 2. Automatic push of changes
echo "📤 Committing and pushing local changes to GitHub..."
git add .
git commit -m "Auto-deploy: update backend and frontend configuration" || echo "Nothing to commit"

# If we have a target branch in mind, push current HEAD to it
LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

deploy_env() {
  local IFS="|"
  read -r name dir branch port_front port_back container_prefix <<< "$1"

  # Push to the remote branch that the server expects
  echo "Pushing local $LOCAL_BRANCH to remote $branch..."
  git push origin $LOCAL_BRANCH:$branch --force
  
  # Determine backend URL for frontend (on reloto.ru we'll assume standard naming)
  local backend_url=""
  if [ "$name" == "main" ]; then
    backend_url="https://coin.reloto.ru/api/rates/rub"
  else
    backend_url="https://coinlover-dev.reloto.ru/api/rates/rub"
  fi

  echo "------------------------------------------"
  echo "🚀 Deploying to $name ($branch branch)..."
  echo "Front: $port_front | Back: $port_back"
  echo "------------------------------------------"

  ssh $REMOTE_USER@$REMOTE_HOST << EOF
    if [ ! -d "$dir" ]; then
      mkdir -p /root/MyProjects
      cd /root/MyProjects
      git clone $REPO_URL $(basename $dir)
    fi
    cd $dir
    
    # Update code
    git fetch origin
    git checkout $branch || git checkout -b $branch origin/$branch
    git pull origin $branch
    
    # Generate docker-compose on the fly
    cat > docker-compose.yml << EOT
services:
  frontend:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: ${container_prefix}-frontend
    ports:
      - "$port_front:80"
    restart: always
    environment:
      - VITE_PY_BACKEND_URL=${backend_url}
    depends_on:
      - backend

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${container_prefix}-backend
    ports:
      - "$port_back:8000"
    restart: always
EOT

    # Stop and clear port to avoid "port already allocated" errors
    docker compose down
    fuser -k $port_back/tcp || true
    
    # Restart containers
    docker compose up -d --build --remove-orphans
EOF
  echo "✅ Finished $name deployment!"
}

# Target selection
TARGET=$1

if [ -z "$TARGET" ]; then
  echo "Where to deploy?"
  echo "1) Dev (https://coinlover-dev.reloto.ru)"
  echo "2) Main (https://coin.reloto.ru)"
  echo "3) Both"
  read -p "Choose option (1-3): " choice
  case $choice in
    1) TARGET="dev" ;;
    2) TARGET="main" ;;
    3) TARGET="all" ;;
    *) echo "Invalid option. Exiting."; exit 1 ;;
  esac
fi

case $TARGET in
  "dev")
    deploy_env "$ENV_DEV"
    ;;
  "main")
    deploy_env "$ENV_MAIN"
    ;;
  "all")
    deploy_env "$ENV_DEV"
    deploy_env "$ENV_MAIN"
    ;;
  *)
    echo "Unknown target: $TARGET. Use 'dev', 'main', or 'all'."
    exit 1
    ;;
esac

echo "✨ All selected deployments are complete!"
