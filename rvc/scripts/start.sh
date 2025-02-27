#!/bin/bash
# Don't exit immediately on errors so we can see what's happening
# set -e 

# Set necessary environment variables
# Add environment variables to .bashrc
cat >> ~/.bashrc << EOL
export TERM=xterm-256color
export weight_root="/app/weights"
export index_root="/app/logs"
export rmvpe_root="/app/assets/rmvpe"
EOL

# Source .bashrc to apply changes
source ~/.bashrc
echo "Added environment variables to ~/.bashrc and sourced it"

echo "Starting RVC server..."


# Create the weights directory and symlink all model files
echo "Setting up model symlinks..."
mkdir -p /app/weights
mkdir -p /app/None
# Remove any existing symlinks first to avoid errors
rm -f /app/weights/*
# Create symlinks for all model files
ln -sf /app/assets/weights/* /app/weights/
ln -sf /app/assets/weights/* /app/None/
echo "Model symlinks created:"
ls -la /app/weights/
ls -la /app/None/
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