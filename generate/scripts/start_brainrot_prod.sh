aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Stop and remove all containers
docker stop brainrot-container
docker rm brainrot-container

# Remove old images
docker rmi $(docker images -q ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/brainrot) || true

# Pull and run new image
docker pull ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/brainrot:latest

docker run -d \
  --name brainrot-container \
  -e MODE=production \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/brainrot


