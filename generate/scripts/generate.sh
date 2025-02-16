#!/bin/bash

echo "Starting Gunicorn server..."
gunicorn --timeout 300 -w 1 -b 0.0.0.0:5005 --access-logfile access.log --error-logfile error.log --chdir /app/brainrot "transcribe:app" &

# Check if MODE is set, default to development if not
if [ -z "$MODE" ]; then
    MODE="development"
fi

if [ "$MODE" = "production" ]; then
    echo "Running production build script..."
    /root/.bun/bin/pm2 start --interpreter /root/.bun/bin/bun build.ts --name build-process --log /app/brainrot/pm2.log
    
    tail -f /app/brainrot/pm2.log /app/brainrot/access.log /app/brainrot/error.log
else
    echo "Running local build script..."
    bun run /app/brainrot/localBuild.ts
fi