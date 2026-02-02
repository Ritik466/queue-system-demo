# Queue System Deployment Guide (EC2)

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured locally
- SSH key pair for EC2 access (`KeyName`)
- Docker installed on target EC2 instance (we provide user-data to install it)
- Frontend and Backend ready

---

## Overview
This guide shows how to run the Backend and Frontend on EC2 instances using Docker (docker-compose or Docker CLI). You can either push images to ECR and pull them from EC2, or build images directly on the instance.

---

## Step 1: Build and Test Docker Images Locally (optional)

### Backend
```bash
cd Backend
docker build -t queue-backend:latest .
docker tag queue-backend:latest queue-backend:1.0.0
```

### Frontend
```bash
cd Frontend/frontend
docker build -t queue-frontend:latest .
docker tag queue-frontend:latest queue-frontend:1.0.0
```

You can push these images to ECR (see Step 2) or transfer/build on the EC2 instance.

---

## Step 2: (Optional) Push Images to ECR for EC2 to Pull
If you prefer EC2 to pull images, create ECR repositories and push images.

```bash
# Create repos (once)
aws ecr create-repository --repository-name queue-system/backend --region us-east-1
aws ecr create-repository --repository-name queue-system/frontend --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag queue-backend:latest <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/backend:latest
docker push <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/backend:latest

docker tag queue-frontend:latest <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/frontend:latest
docker push <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/frontend:latest
```

If EC2 will pull from ECR, attach an instance profile with `AmazonEC2ContainerRegistryReadOnly`.

---

## Step 3: Set Up AWS RDS (PostgreSQL)
Same as before — create an RDS instance accessible from your EC2 security group.

```bash
aws rds create-db-instance \
    --db-instance-identifier queue-db \
    --db-instance-class db.t4g.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YourSecurePassword123 \
    --allocated-storage 20 \
    --region us-east-1
```

Update environment variables (see Step 7) to point at the RDS endpoint.

---

## Step 4: Provision EC2 Instances (with user-data)
Create an EC2 instance (Ubuntu 22.04 / Amazon Linux 2) and use a user-data script to install Docker, Docker Compose plugin, clone the repo and start the services with `docker compose`.

Example `ec2-user-data.sh` (cloud-init):
```bash
#!/bin/bash
set -e
# Install deps (Ubuntu example)
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io
usermod -aG docker ubuntu
# Install docker compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Clone repo and start
cd /home/ubuntu
git clone https://github.com/your-org/Queue-system-demo.git app || (cd app && git pull)
cd app/Backend
# Option A: pull from ECR (requires instance role with ECR read access)
# docker pull <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/backend:latest

# Start with docker compose (expects docker-compose.yml in Backend folder)
docker compose up -d --build

```

Run with AWS CLI (replace AMI, KeyName, SecurityGroup, Subnet, and IAM instance profile):

```bash
aws ec2 run-instances \
    --image-id ami-0123456789abcdef0 \
    --count 1 \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids sg-0123456789abcdef0 \
    --subnet-id subnet-0123456789abcdef0 \
    --iam-instance-profile Name=EC2ECRReadOnlyProfile \
    --user-data file://ec2-user-data.sh \
    --region us-east-1
```

Notes:
- If using ECR, ensure the instance profile has `AmazonEC2ContainerRegistryReadOnly`.
- Adjust the `git clone` URL or copy artifacts into the instance if you prefer not to use git on the instance.

---

## Step 5: Docker Compose / Systemd Service
Place a `docker-compose.yml` (or use the existing `docker-compose.yml` in `Backend/`) to run both backend and frontend as needed. Start with `docker compose up -d`.

If you want the services to start on reboot, create a simple systemd unit:

`/etc/systemd/system/queue-app.service`:
```ini
[Unit]
Description=Queue App (docker compose)
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/home/ubuntu/app/Backend
RemainAfterExit=yes
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable queue-app.service
systemctl start queue-app.service
```

---

## Step 6: Security Groups, Load Balancer, and Networking
- Security Group: allow `SSH (22)` from your IP, `HTTP (80)` and/or `HTTPS (443)` from 0.0.0.0/0 (or your CIDR), and port `3000` if you serve backend directly.
- If you want high-availability and routing, create an Application Load Balancer and register EC2 instances as targets.

Example create ALB (short):
```bash
aws elbv2 create-load-balancer --name queue-system-lb --subnets subnet-xxx subnet-yyy --security-groups sg-xxx --scheme internet-facing --type application --region us-east-1
```

Then create target group(s) and register instance IDs.

---

## Step 7: Environment Variables
Update `.env` to point at the RDS endpoint and any other production values.

Example:
```
DB_HOST=queue-db.xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123
DB_NAME=queue_db
```

Place the `.env` on the EC2 instance (e.g., in `/home/ubuntu/app/Backend/.env`) and ensure the docker-compose reads it.

---

## Monitoring & Logs
- Use `docker logs <container>` to view logs on EC2.
- Optionally install and configure the CloudWatch agent to ship logs and metrics.

Example tailing logs:
```bash
docker compose logs -f
docker logs -f queue-backend
```

---

## Cleanup

```bash
# Terminate EC2 instances
aws ec2 terminate-instances --instance-ids i-0123456789abcdef0 --region us-east-1

# (Optional) Delete ECR repositories
aws ecr delete-repository --repository-name queue-system/backend --force
aws ecr delete-repository --repository-name queue-system/frontend --force

# Delete RDS (use caution)
aws rds delete-db-instance --db-instance-identifier queue-db --skip-final-snapshot
```

---

## Troubleshooting
- If containers fail to start, check `docker compose logs` and `journalctl -u queue-app.service`.
- If EC2 cannot pull from ECR, verify the instance profile and ECR permissions.

---

If you want, I can:
- add an `ec2-user-data.sh` file to the repo,
- update `deploy.sh`/`deploy.ps1` to provision EC2 instances using the above user-data,
- or create a sample `systemd` unit and `docker-compose.yml` tuned for EC2.

# Queue System Deployment Guide

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured locally
- Docker installed
- Frontend and Backend ready

---

## Step 1: Build and Test Docker Images Locally

### Backend
```bash
cd Backend
docker build -t queue-backend:latest .
docker tag queue-backend:latest queue-backend:1.0.0
```

### Frontend (Create Dockerfile)
Create `Frontend/frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `Frontend/frontend/nginx.conf`:
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    location /queue {
        proxy_pass http://backend:3000;
    }
}
```

```bash
cd Frontend/frontend
docker build -t queue-frontend:latest .
docker tag queue-frontend:latest queue-frontend:1.0.0
```

### Test Docker Compose
```bash
cd Backend
docker-compose up --build
```

---

## Step 2: Set Up AWS ECR

### Create ECR Repositories
```bash
# Backend repository
aws ecr create-repository \
    --repository-name queue-system/backend \
    --region us-east-1

# Frontend repository
aws ecr create-repository \
    --repository-name queue-system/frontend \
    --region us-east-1
```

### Get ECR Login Token and Push
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR-AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag images
docker tag queue-backend:latest <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/backend:latest
docker tag queue-frontend:latest <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/frontend:latest

# Push to ECR
docker push <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/backend:latest
docker push <AWS-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/queue-system/frontend:latest
```

---

## Step 3: Set Up AWS RDS (PostgreSQL)

```bash
aws rds create-db-instance \
    --db-instance-identifier queue-db \
    --db-instance-class db.t4g.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YourSecurePassword123 \
    --allocated-storage 20 \
    --region us-east-1
```

---

## Step 4: Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name queue-system --region us-east-1
```

---

## Step 5: Create ECS Task Definitions

Create `Backend/ecs-task-def.json`:
See the separate file included in the repo.

Create `Frontend/frontend/ecs-task-def.json`:
See the separate file included in the repo.

Register task definitions:
```bash
aws ecs register-task-definition \
    --cli-input-json file://Backend/ecs-task-def.json \
    --region us-east-1

aws ecs register-task-definition \
    --cli-input-json file://Frontend/frontend/ecs-task-def.json \
    --region us-east-1
```

---

## Step 6: Create ECS Services

```bash
# Backend Service
aws ecs create-service \
    --cluster queue-system \
    --service-name queue-backend \
    --task-definition queue-backend:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
    --region us-east-1

# Frontend Service
aws ecs create-service \
    --cluster queue-system \
    --service-name queue-frontend \
    --task-definition queue-frontend:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
    --region us-east-1
```

---

## Step 7: Set Up Load Balancer

```bash
aws elbv2 create-load-balancer \
    --name queue-system-lb \
    --subnets subnet-xxx subnet-yyy \
    --security-groups sg-xxx \
    --scheme internet-facing \
    --type application \
    --region us-east-1
```

---

## Monitoring & Logs

View ECS task logs:
```bash
aws logs tail /ecs/queue-backend --follow --region us-east-1
aws logs tail /ecs/queue-frontend --follow --region us-east-1
```

Check service status:
```bash
aws ecs describe-services \
    --cluster queue-system \
    --services queue-backend queue-frontend \
    --region us-east-1
```

---

## Environment Variables for AWS

Update `.env` for AWS RDS:
```
DB_HOST=queue-db.xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123
DB_NAME=queue_db
```

---

## Cleanup

```bash
# Delete ECS services
aws ecs delete-service --cluster queue-system --service queue-backend --force
aws ecs delete-service --cluster queue-system --service queue-frontend --force

# Delete ECS cluster
aws ecs delete-cluster --cluster queue-system

# Delete ECR repositories
aws ecr delete-repository --repository-name queue-system/backend --force
aws ecr delete-repository --repository-name queue-system/frontend --force

# Delete RDS instance
aws rds delete-db-instance --db-instance-identifier queue-db --skip-final-snapshot
```
