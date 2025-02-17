#!/bin/bash

docker rm -f brainrot-container 2>/dev/null || true

# Validate VIDEO_MODE
valid_modes=("brainrot" "podcast" "monologue")
if [ -n "$VIDEO_MODE" ] && [[ ! " ${valid_modes[@]} " =~ " ${VIDEO_MODE} " ]]; then
    echo "Error: Invalid VIDEO_MODE '${VIDEO_MODE}'"
    echo "Valid modes are: ${valid_modes[*]}"
    echo "Example usage: VIDEO_MODE=podcast ./scripts/start.sh"
    exit 1
fi

CMD="docker run --name brainrot-container"

CMD="$CMD -e MODE=${MODE:-dev}"
CMD="$CMD -e VIDEO_MODE=${VIDEO_MODE:-brainrot}"

# Mount directories for non-production modes
if [ "${MODE}" != "production" ]; then
    echo "Local mode: Mounting source directories"
    CMD="$CMD -v $(pwd)/out:/app/brainrot/out"
    # Add development bind mounts
    CMD="$CMD -v $(pwd)/src:/app/brainrot/src"
    CMD="$CMD -v $(pwd)/public:/app/brainrot/public"
    CMD="$CMD -v $(pwd)/.env:/app/brainrot/.env"
    CMD="$CMD -v $(pwd)/audioGenerator.ts:/app/brainrot/audioGenerator.ts"
    CMD="$CMD -v $(pwd)/localBuild.ts:/app/brainrot/localBuild.ts"
    CMD="$CMD -v $(pwd)/cleanSrt.ts:/app/brainrot/cleanSrt.ts"
    CMD="$CMD -v $(pwd)/concat.ts:/app/brainrot/concat.ts"
    CMD="$CMD -v $(pwd)/transcript.ts:/app/brainrot/transcript.ts"
    CMD="$CMD -v $(pwd)/transcribe.ts:/app/brainrot/transcribe.ts"
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