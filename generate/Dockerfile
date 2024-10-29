# Use an official Fedora image as a parent image
FROM fedora:latest

# Enable RPM Fusion Free and Non-Free Repositories
RUN dnf install -y \
    https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm \
    https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm

# Install necessary packages including build tools, Python development headers, FFmpeg, and Chromium
RUN dnf install -y python3 python3-pip npm gcc gcc-c++ make python3-devel chromium
RUN dnf install -y ffmpeg --allowerasing

# Set environment variables to force CPU usage
ENV CUDA_VISIBLE_DEVICES=""
ENV FORCE_CPU=1
ENV TORCH_DEVICE="cpu"

# Copy requirements first to leverage Docker cache
COPY requirements.txt /app/brainrot/
WORKDIR /app/brainrot

# Clean any existing torch installations and install CPU version
RUN pip3 uninstall -y torch torchvision torchaudio
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other Python dependencies
RUN pip3 install gunicorn
RUN pip3 install -r requirements.txt

# Copy the rest of the application
COPY . /app/brainrot

# Install Node.js dependencies
RUN npm install pm2 -g
RUN npm install

# Command to run the application
CMD ["/bin/sh", "-c", "/usr/bin/python3 /usr/local/bin/gunicorn -w 1 -b 0.0.0.0:5000 --access-logfile access.log --error-logfile error.log transcribe:app --daemon --timeout 120 && tail -f /dev/null"]