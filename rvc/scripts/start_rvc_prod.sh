aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

docker stop rvc-container
docker rm rvc-container

docker rmi $(docker images -q ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/rvc) || true

docker pull ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/rvc:latest

docker run -d \
  --gpus all \
  --name rvc-container \
  -p 5555:5555 \
  -e MODE=production \
  -v $(pwd)/audios:/app/audios \
  -v $(pwd)/server/logs:/app/server/logs \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/rvc