#!/bin/bash
set -e  # Exit on error

# Check if AWS_ACCOUNT_ID is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "ERROR: AWS_ACCOUNT_ID environment variable is not set"
  exit 1
fi

# Define ECR repository URL to avoid expansion issues
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="$ECR_URL/brainrot:latest"

echo "ECR URL: $ECR_URL"
echo "Image: $IMAGE_NAME"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_URL"

# Stop and remove any existing container
echo "Stopping any existing container..."
docker stop brainrot-container || true
docker rm brainrot-container || true

# Clean up old images
echo "Cleaning up old images..."
OLD_IMAGES=$(docker images -q "$ECR_URL/brainrot" 2>/dev/null) || true
if [ -n "$OLD_IMAGES" ]; then
  docker rmi $OLD_IMAGES || true
fi

# Pull latest image
echo "Pulling latest image..."
docker pull "$IMAGE_NAME"

# Run container
echo "Starting container..."
docker run -d \
  --name brainrot-container \
  -e MODE=production \
  "$IMAGE_NAME"

echo "Brainrot deployment complete!"


