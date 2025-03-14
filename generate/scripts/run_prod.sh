#!/bin/bash
set -e

if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    source "$(dirname "$0")/../.env"
    set +a
else
    echo "ERROR: .env file not found"
    exit 1
fi

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "ERROR: AWS_ACCOUNT_ID environment variable is not set"
  echo "Please run: export AWS_ACCOUNT_ID=your_aws_account_id"
  exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "WARNING: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set"
  echo "Make sure you have configured AWS credentials with 'aws configure' or by setting environment variables"
  echo "If you've already configured AWS CLI, this warning can be ignored"
fi

ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
BRAINROT_IMAGE="$ECR_URL/brainrot:latest"
RVC_IMAGE="$ECR_URL/rvc:latest"

echo "Checking local images against ECR..."

check_and_pull_image() {
    local image_name=$1
    local local_digest
    local remote_digest
    
    echo "Checking $image_name..."
    
    local_digest=$(docker images --no-trunc --quiet "$image_name" 2>/dev/null)
    
    if aws ecr describe-images --repository-name=$(echo $image_name | cut -d'/' -f2) --image-ids imageTag=latest --region us-east-1 &>/dev/null; then
        echo "Found image in ECR, checking if update needed..."
        if docker pull "$image_name" &>/dev/null; then
            echo "Successfully pulled updated image from ECR"
        else
            echo "Failed to pull from ECR, using local image"
        fi
    else
        echo "Image not found in ECR or access denied, using local image"
    fi
}

# Check both images
check_and_pull_image "$BRAINROT_IMAGE"
check_and_pull_image "$RVC_IMAGE"

echo "Creating docker-compose.yml file..."
cat > docker-compose.yml << EOL
version: '3.8'

services:
  brainrot:
    image: ${BRAINROT_IMAGE}
    container_name: brainrot-container
    ports:
      - "3000:3000"
    volumes:
      - ./shared_data:/app/brainrot/shared_data
    environment:
      - MODE=production
      - RVC_SERVICE_URL=http://rvc:5555
    depends_on:
      - rvc

  rvc:
    image: ${RVC_IMAGE}
    container_name: rvc-container
    ports:
      - "5555:5555"
    volumes:
      - ./shared_data:/app/shared_data
    environment:
      - MODE=production
      - SHARED_DIR=/app/shared_data
EOL

if command -v nvidia-smi &> /dev/null; then
  echo "NVIDIA GPU detected, adding GPU configuration to docker-compose.yml"
  cat >> docker-compose.yml << EOL
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
EOL
else
  echo "WARNING: NVIDIA GPU not detected. RVC service may not work properly without GPU acceleration."
fi

echo "Starting containers with docker-compose..."
docker-compose up -d

echo "Deployment complete!"
echo "Brainrot service should be available at: http://localhost:3000"
echo "RVC service should be available at: http://localhost:5555"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop the services:"
echo "  docker-compose down" 