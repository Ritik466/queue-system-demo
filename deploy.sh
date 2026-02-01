#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
BACKEND_REPO="queue-system/backend"
FRONTEND_REPO="queue-system/frontend"

echo -e "${YELLOW}=== Queue System AWS Deployment ===${NC}\n"

# Validate AWS Account ID
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: AWS_ACCOUNT_ID not set${NC}"
    echo "Usage: AWS_ACCOUNT_ID=123456789012 ./deploy.sh"
    exit 1
fi

# Step 1: Validate AWS CLI
echo -e "${YELLOW}[1/6] Checking AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS CLI found${NC}\n"

# Step 2: Login to ECR
echo -e "${YELLOW}[2/6] Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ECR login successful${NC}\n"
else
    echo -e "${RED}✗ ECR login failed${NC}"
    exit 1
fi

# Step 3: Build and push backend
echo -e "${YELLOW}[3/6] Building and pushing backend...${NC}"
cd Backend
docker build -t $ECR_REGISTRY/$BACKEND_REPO:latest .
docker tag $ECR_REGISTRY/$BACKEND_REPO:latest $ECR_REGISTRY/$BACKEND_REPO:$(date +%s)
docker push $ECR_REGISTRY/$BACKEND_REPO:latest
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend pushed to ECR${NC}\n"
else
    echo -e "${RED}✗ Backend push failed${NC}"
    exit 1
fi
cd ..

# Step 4: Build and push frontend
echo -e "${YELLOW}[4/6] Building and pushing frontend...${NC}"
cd Frontend/frontend
docker build -t $ECR_REGISTRY/$FRONTEND_REPO:latest .
docker tag $ECR_REGISTRY/$FRONTEND_REPO:latest $ECR_REGISTRY/$FRONTEND_REPO:$(date +%s)
docker push $ECR_REGISTRY/$FRONTEND_REPO:latest
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend pushed to ECR${NC}\n"
else
    echo -e "${RED}✗ Frontend push failed${NC}"
    exit 1
fi
cd ../..

# Step 5: Update ECS task definitions
echo -e "${YELLOW}[5/6] Updating ECS task definitions...${NC}"
# Replace placeholder with actual AWS account ID
sed "s/YOUR_AWS_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" Backend/ecs-task-def.json > /tmp/backend-task-def.json
sed "s/YOUR_AWS_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" Frontend/frontend/ecs-task-def.json > /tmp/frontend-task-def.json

aws ecs register-task-definition --cli-input-json file:///tmp/backend-task-def.json --region $AWS_REGION
aws ecs register-task-definition --cli-input-json file:///tmp/frontend-task-def.json --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Task definitions registered${NC}\n"
else
    echo -e "${RED}✗ Task definition registration failed${NC}"
    exit 1
fi

# Step 6: Update ECS services
echo -e "${YELLOW}[6/6] Updating ECS services...${NC}"
aws ecs update-service --cluster queue-system --service queue-backend --force-new-deployment --region $AWS_REGION
aws ecs update-service --cluster queue-system --service queue-frontend --force-new-deployment --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ECS services updated${NC}\n"
else
    echo -e "${RED}✗ ECS service update failed${NC}"
    exit 1
fi

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "\nNext steps:"
echo "1. Monitor deployment: aws ecs describe-services --cluster queue-system --services queue-backend queue-frontend --region $AWS_REGION"
echo "2. View logs: aws logs tail /ecs/queue-backend --follow --region $AWS_REGION"
