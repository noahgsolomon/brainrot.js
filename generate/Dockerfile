# Use an official Fedora image as a parent image
FROM fedora:latest

# Enable RPM Fusion Free and Non-Free Repositories
RUN dnf install -y \
    https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm \
    https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm

# Install necessary packages including build tools, Python development headers, FFmpeg, and Chromium
RUN dnf install -y python3 python3-pip npm gcc gcc-c++ make python3-devel chromium
RUN dnf install -y ffmpeg --allowerasing

# Copy the current directory contents into the container at /app
COPY . /app/brainrot

# Set the working directory to /app/brainrot
WORKDIR /app/brainrot

# Install Python dependencies
RUN pip3 install gunicorn
RUN pip3 install -r requirements.txt

# Install Node.js dependencies
RUN npm install pm2 -g
RUN npm install

# Command to run the application
CMD  /usr/bin/python3 /usr/local/bin/gunicorn -w 1 -b 0.0.0.0:5000 --access-logfile access.log --error-logfile error.log transcribe:app --daemon --timeout 120 && tail -f /dev/null
