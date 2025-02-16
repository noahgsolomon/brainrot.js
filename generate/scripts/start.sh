#!/bin/bash

docker rm -f brainrot-container 2>/dev/null || true

CMD="docker run --name brainrot-container"

CMD="$CMD -e MODE=${MODE:-dev}"

# Mount directories for non-production modes
if [ "${MODE}" != "production" ]; then
    echo "Local mode: Mounting out directory"
    CMD="$CMD -v $(pwd)/out:/app/brainrot/out"
fi

# Additional mounts for studio mode
if [ "${MODE}" = "studio" ]; then
    echo "Studio mode: Mounting additional directories"
    CMD="$CMD -v $(pwd)/public:/app/brainrot/public"
    CMD="$CMD -v $(pwd)/src/tmp:/app/brainrot/src/tmp"
fi

# Only run detached in production
if [ "${MODE}" = "production" ]; then
    CMD="$CMD -d"
fi

CMD="$CMD brainrot"
eval "$CMD"

if [ "${MODE}" = "studio" ]; then
    echo "Container finished, starting development server..."
    bun run start
fi