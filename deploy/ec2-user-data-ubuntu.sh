#!/bin/bash
set -euo pipefail

# EC2 user-data for Ubuntu 22.04
# - Installs Docker + Docker Compose plugin
# - Clones repo (or pulls if exists)
# - Starts services with `docker compose up -d`

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Add ubuntu user to docker group (may vary by AMI username)
if id ubuntu &>/dev/null; then
  usermod -aG docker ubuntu || true
fi

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VER="v2.20.2"
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-$(dpkg --print-architecture)" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Optional: configure ECR login helper if using ECR
# If using ECR and instance role, docker can pull from ECR without credentials.

# Clone repo into /home/ubuntu/app (replace with your repo URL)
APP_DIR="/home/ubuntu/app"
REPO_URL="https://github.com/your-org/Queue-system-demo.git"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull || true
else
  git clone "$REPO_URL" "$APP_DIR"
fi

chown -R ubuntu:ubuntu "$APP_DIR" || true

# Start the application (expects docker-compose.yml or compose v2 file in Backend/)
cd "$APP_DIR/Backend"
docker compose up -d --build || {
  echo "docker compose failed, dumping logs" >&2
  docker compose logs --no-color || true
  exit 1
}

exit 0
