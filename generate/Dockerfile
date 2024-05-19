# Use an official Fedora image as a parent image
FROM fedora:latest

# Install necessary packages including build tools and Python development headers
RUN dnf install -y python3 python3-pip npm gcc gcc-c++ make python3-devel

# Copy the current directory contents into the container at /app
COPY deepai /app/brainrot

# Set the working directory to /app/brainrot
WORKDIR /app/brainrot

# Install Python dependencies
RUN pip3 install gunicorn
RUN pip3 install -r requirements.txt

# Install Node.js dependencies
RUN npm install pm2 -g
RUN npm install

# Command to run the application
CMD /usr/bin/python3 /usr/local/bin/gunicorn -w 1 -b 0.0.0.0:5000 transcribe:app --daemon && pm2 start build.mjs && tail -f /dev/null
