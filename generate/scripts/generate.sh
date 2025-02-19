#!/bin/bash

echo "Starting Gunicorn server..."
gunicorn --timeout 300 -w 1 -b 0.0.0.0:5005 --access-logfile access.log --error-logfile error.log --chdir /app/brainrot "transcribe:app" &

# Check if MODE is set, default to development if not
if [ -z "$MODE" ]; then
    MODE="development"
fi

# Validate VIDEO_MODE
valid_modes=("brainrot" "podcast" "monologue")
if [ -z "$VIDEO_MODE" ]; then
    VIDEO_MODE="brainrot"
    echo "No VIDEO_MODE specified, defaulting to: brainrot"
elif [[ ! " ${valid_modes[@]} " =~ " ${VIDEO_MODE} " ]]; then
    echo "Error: Invalid VIDEO_MODE '${VIDEO_MODE}'"
    echo "Valid modes are: ${valid_modes[*]}"
    echo "Example usage: VIDEO_MODE=podcast ./scripts/start.sh"
    exit 1
fi

echo "Using video mode: $VIDEO_MODE"

if [ "$MODE" = "production" ]; then
    echo "Running production build script..."
    /root/.bun/bin/pm2 start --interpreter /root/.bun/bin/bun build.ts --name build-process --log /app/brainrot/pm2.log
    
    tail -f /app/brainrot/pm2.log /app/brainrot/access.log /app/brainrot/error.log
else
    echo "Running local build script..."
    VIDEO_MODE=$VIDEO_MODE /root/.bun/bin/bun run /app/brainrot/localBuild.ts
fi