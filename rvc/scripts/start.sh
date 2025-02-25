#!/bin/bash
set -e

echo "Starting RVC server..."

mkdir -p /app/server/logs

gunicorn --timeout 300 -w 1 -b 0.0.0.0:5555 --access-logfile /app/server/logs/access.log --error-logfile /app/server/logs/error.log "server:app"

tail -f /app/server/logs/access.log /app/server/logs/error.log