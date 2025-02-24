#!/bin/bash
set -e  # Exit on error

# Check if AWS_ACCOUNT_ID is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "ERROR: AWS_ACCOUNT_ID environment variable is not set"
  exit 1
fi

# Define ECR repository URL to avoid expansion issues
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="$ECR_URL/rvc:latest"

echo "ECR URL: $ECR_URL"
echo "Image: $IMAGE_NAME"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_URL"

# Stop and remove any existing container
echo "Stopping any existing container..."
docker stop rvc-container || true
docker rm rvc-container || true

# Clean up old images
echo "Cleaning up old images..."
OLD_IMAGES=$(docker images -q "$ECR_URL/rvc" 2>/dev/null) || true
if [ -n "$OLD_IMAGES" ]; then
  docker rmi $OLD_IMAGES || true
fi

# Pull latest image
echo "Pulling latest image..."
docker pull "$IMAGE_NAME"

# Create necessary directories
echo "Creating volume directories..."
mkdir -p ~/audios ~/server/logs

# Run container
echo "Starting container..."
docker run -d \
  --gpus all \
  --name rvc-container \
  -p 5555:5555 \
  -e MODE=production \
  -v ~/audios:/app/audios \
  -v ~/server/logs:/app/server/logs \
  "$IMAGE_NAME"

echo "RVC deployment complete!"