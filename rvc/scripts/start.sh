#!/bin/bash
# Don't exit immediately on errors so we can see what's happening
# set -e 

echo "Starting RVC server..."

# Create log directory
mkdir -p /app/server/logs

# Debug info
echo "Current directory: $(pwd)"
echo "Listing files in current directory:"
ls -la
echo "Checking for server.py:"
find / -name "server.py" 2>/dev/null || echo "server.py not found"
echo "Python path: $PYTHONPATH"

# Make sure server.py is in the PYTHONPATH
export PYTHONPATH=$PYTHONPATH:/app

echo "Starting gunicorn with server:app"
# Run gunicorn but don't fail if it errors
gunicorn --timeout 300 -w 1 -b 0.0.0.0:5555 --access-logfile /app/server/logs/access.log --error-logfile /app/server/logs/error.log "server:app" || {
  echo "Gunicorn failed to start. See logs for details:"
  cat /app/server/logs/error.log 2>/dev/null || echo "No error log found"
  # Keep container running for debugging
  echo "Keeping container running for debugging. Press Ctrl+C to exit."

  sleep infinity
}

# Keep the container running by tailing logs
echo "Tailing log files"
tail -f /app/server/logs/access.log /app/server/logs/error.log