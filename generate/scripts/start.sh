#!/bin/bash

docker rm -f brainrot-container 2>/dev/null || true

CMD="docker run --name brainrot-container"

CMD="$CMD -e MODE=${MODE:-dev}"

if [ "${MODE}" = "studio" ]; then
    echo "Studio mode: Mounting public directory"
    CMD="$CMD -v $(pwd)/public:/app/brainrot/public"
    CMD="$CMD -v $(pwd)/src/tmp:/app/brainrot/src/tmp"
fi

if [ "${MODE}" = "production" ]; then
    CMD="$CMD -d"
fi

CMD="$CMD brainrot"
eval "$CMD"

if [ "${MODE}" = "studio" ]; then
    echo "Waiting for container to finish..."
    while [ "$(docker ps -q -f name=brainrot-container)" ]; do
        sleep 1
    done
    echo "Container finished, starting development server..."
    bun run start
fi