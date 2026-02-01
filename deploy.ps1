# Queue System AWS Deployment Script (PowerShell)

param(
    [string]$AwsAccountId = $env:AWS_ACCOUNT_ID,
    [string]$AwsRegion = "us-east-1"
)

# Configuration
$ECR_REGISTRY = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
$BACKEND_REPO = "queue-system/backend"
$FRONTEND_REPO = "queue-system/frontend"
$CLUSTER_NAME = "queue-system"

# Color output helper
function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    
    $color = @{
        "ERROR" = "Red"
        "SUCCESS" = "Green"
        "WARNING" = "Yellow"
        "INFO" = "Cyan"
    }[$Status]
    
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# Main deployment
Write-Host "`n=== Queue System AWS Deployment ===" -ForegroundColor Yellow

# Validate AWS Account ID
if ([string]::IsNullOrEmpty($AwsAccountId)) {
    Write-Status "AWS_ACCOUNT_ID not provided" "ERROR"
    Write-Host "`nUsage: .\deploy.ps1 -AwsAccountId 123456789012 -AwsRegion us-east-1"
    exit 1
}

# Step 1: Check AWS CLI
Write-Status "Checking AWS CLI..." "INFO"
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Status "AWS CLI not found. Please install it first." "ERROR"
    exit 1
}
Write-Status "AWS CLI found" "SUCCESS"

# Step 2: ECR Login
Write-Status "Logging in to ECR..." "INFO"
$loginCmd = aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $ECR_REGISTRY
if ($LASTEXITCODE -eq 0) {
    Write-Status "ECR login successful" "SUCCESS"
} else {
    Write-Status "ECR login failed" "ERROR"
    exit 1
}

# Step 3: Build and push backend
Write-Status "Building and pushing backend..." "INFO"
Push-Location Backend
docker build -t "$ECR_REGISTRY/$BACKEND_REPO`:latest" .
docker tag "$ECR_REGISTRY/$BACKEND_REPO`:latest" "$ECR_REGISTRY/$BACKEND_REPO`:$(Get-Date -UFormat %s)"
docker push "$ECR_REGISTRY/$BACKEND_REPO`:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Status "Backend pushed to ECR" "SUCCESS"
} else {
    Write-Status "Backend push failed" "ERROR"
    exit 1
}
Pop-Location

# Step 4: Build and push frontend
Write-Status "Building and pushing frontend..." "INFO"
Push-Location "Frontend\frontend"
docker build -t "$ECR_REGISTRY/$FRONTEND_REPO`:latest" .
docker tag "$ECR_REGISTRY/$FRONTEND_REPO`:latest" "$ECR_REGISTRY/$FRONTEND_REPO`:$(Get-Date -UFormat %s)"
docker push "$ECR_REGISTRY/$FRONTEND_REPO`:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Status "Frontend pushed to ECR" "SUCCESS"
} else {
    Write-Status "Frontend push failed" "ERROR"
    exit 1
}
Pop-Location

# Step 5: Register task definitions
Write-Status "Registering ECS task definitions..." "INFO"

# Update task definitions with actual AWS Account ID
$backendTaskDef = Get-Content "Backend\ecs-task-def.json" | ForEach-Object { $_ -replace "YOUR_AWS_ACCOUNT_ID", $AwsAccountId }
$frontendTaskDef = Get-Content "Frontend\frontend\ecs-task-def.json" | ForEach-Object { $_ -replace "YOUR_AWS_ACCOUNT_ID", $AwsAccountId }

$backendTaskDef | Out-File -FilePath ($env:TEMP + "\backend-task-def.json") -Encoding UTF8
$frontendTaskDef | Out-File -FilePath ($env:TEMP + "\frontend-task-def.json") -Encoding UTF8

aws ecs register-task-definition --cli-input-json "file://$(($env:TEMP + '\backend-task-def.json') -replace '\\', '/')" --region $AwsRegion
aws ecs register-task-definition --cli-input-json "file://$(($env:TEMP + '\frontend-task-def.json') -replace '\\', '/')" --region $AwsRegion

if ($LASTEXITCODE -eq 0) {
    Write-Status "Task definitions registered" "SUCCESS"
} else {
    Write-Status "Task definition registration failed" "ERROR"
    exit 1
}

# Step 6: Update services
Write-Status "Updating ECS services..." "INFO"
aws ecs update-service --cluster $CLUSTER_NAME --service queue-backend --force-new-deployment --region $AwsRegion
aws ecs update-service --cluster $CLUSTER_NAME --service queue-frontend --force-new-deployment --region $AwsRegion

if ($LASTEXITCODE -eq 0) {
    Write-Status "ECS services updated" "SUCCESS"
} else {
    Write-Status "ECS service update failed" "ERROR"
    exit 1
}

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "1. Monitor deployment:"
Write-Host "   aws ecs describe-services --cluster $CLUSTER_NAME --services queue-backend queue-frontend --region $AwsRegion"
Write-Host "`n2. View logs:"
Write-Host "   aws logs tail /ecs/queue-backend --follow --region $AwsRegion"
