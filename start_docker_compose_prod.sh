#!/bin/bash
set -e  # Exit on error

# Check if AWS_ACCOUNT_ID is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "ERROR: AWS_ACCOUNT_ID environment variable is not set"
  exit 1
fi

# Define ECR repository URL
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
BRAINROT_IMAGE="$ECR_URL/brainrot:latest"
RVC_IMAGE="$ECR_URL/rvc:latest"

echo "ECR URL: $ECR_URL"
echo "Brainrot Image: $BRAINROT_IMAGE"
echo "RVC Image: $RVC_IMAGE"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_URL"

# Stop and remove any existing containers
echo "Stopping any existing containers..."
docker-compose down || true

# Enhanced cleanup section
echo "Performing thorough Docker cleanup..."
echo "Stopping all containers..."
docker stop $(docker ps -a -q) 2>/dev/null || true
echo "Removing all containers..."
docker rm $(docker ps -a -q) 2>/dev/null || true
echo "Removing all images..."
docker rmi $(docker images -q) --force 2>/dev/null || true
echo "Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true
echo "Removing unused networks..."
docker network prune -f 2>/dev/null || true
echo "Final system prune..."
docker system prune -a -f --volumes

# Check available disk space
echo "Checking available disk space..."
df -h /

# Pull latest images
echo "Pulling latest images..."
docker pull "$BRAINROT_IMAGE"
docker pull "$RVC_IMAGE"

# Create necessary directories
echo "Creating shared directories..."

mkdir -p shared_data

# Clean up any existing files that might cause permission issues
echo "Cleaning up existing files in shared_data..."
sudo rm -f shared_data/instrumental.flac shared_data/vocal.flac

# Set permissions with sudo to ensure it works
echo "Setting permissions on shared_data directory..."
sudo chown -R $(whoami):$(whoami) shared_data
sudo chmod -R 777 shared_data

# Create docker-compose.yml file
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
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
EOL

# Start containers with docker-compose
echo "Starting containers with docker-compose..."
docker-compose up -d

echo "Deployment complete!" 