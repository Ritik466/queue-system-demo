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
