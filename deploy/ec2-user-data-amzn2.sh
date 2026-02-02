#!/bin/bash
set -euo pipefail

# EC2 user-data for Amazon Linux 2
# - Installs Docker + Docker Compose plugin
# - Clones repo (or pulls if exists)
# - Starts services with `docker compose up -d`

yum update -y
yum install -y git

# Install Docker
amazon-linux-extras install -y docker
systemctl enable --now docker

# Add ec2-user to docker group
if id ec2-user &>/dev/null; then
  usermod -aG docker ec2-user || true
fi

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VER="v2.20.2"
ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ]; then ARCH_TAG="x86_64"; else ARCH_TAG="$ARCH"; fi
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-${ARCH_TAG}" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Optional: configure ECR login helper if using ECR

# Clone repo into /home/ec2-user/app (replace with your repo URL)
APP_DIR="/home/ec2-user/app"
REPO_URL="https://github.com/your-org/Queue-system-demo.git"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull || true
else
  git clone "$REPO_URL" "$APP_DIR"
fi

chown -R ec2-user:ec2-user "$APP_DIR" || true

# Start the application (expects docker-compose.yml or compose v2 file in Backend/)
cd "$APP_DIR/Backend"
docker compose up -d --build || {
  echo "docker compose failed, dumping logs" >&2
  docker compose logs --no-color || true
  exit 1
}

exit 0
