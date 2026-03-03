#!/bin/bash

# Configuration
REMOTE_USER="root"
REMOTE_HOST="server.reloto.ru"
REPO_URL="https://github.com/falcorrus/coinLover.git"

# Define Environments
# Format: NAME|DIR|BRANCH|PORT|CONTAINER
ENV_MAIN="main|/root/MyProjects/coinLover|main|8010|coinlover"
ENV_DEV="dev|/root/MyProjects/coinlover-dev|preview|8011|coinlover-dev"

deploy_env() {
  local IFS="|"
  read -r name dir branch port container <<< "$1"
  
  echo "------------------------------------------"
  echo "🚀 Deploying to $name ($branch branch) on port $port..."
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
  coinlover:
    build: .
    container_name: $container
    ports:
      - "$port:80"
    restart: always
EOT

    # Restart containers
    docker compose up -d --build
EOF
  echo "✅ Finished $name deployment!"
}

# Target selection
TARGET=$1

if [ -z "$TARGET" ]; then
  echo "Where to deploy?"
  echo "1) Dev (https://coinlover-dev.reloto.ru or port 8011)"
  echo "2) Main (https://coin.reloto.ru or port 8010)"
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
