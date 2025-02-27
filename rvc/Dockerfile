# syntax=docker/dockerfile:1
FROM nvidia/cuda:11.6.2-cudnn8-runtime-ubuntu20.04
EXPOSE 7865
WORKDIR /app
COPY . .
# Install dependencies to add PPAs
RUN apt-get update && \
    apt-get install -y -qq ffmpeg aria2 && apt clean && \
    apt-get install -y software-properties-common && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Add the deadsnakes PPA to get Python 3.10
RUN add-apt-repository -y ppa:deadsnakes/ppa
# Install Python 3.10 and pip
RUN apt-get update && \
    apt-get install -y build-essential python-dev python3-dev python3.10-distutils python3.10-dev python3.10 python3.10-venv curl && \
    apt-get clean && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 && \
    curl https://bootstrap.pypa.io/get-pip.py | python3.10
# Set Python 3.10 as the default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1
RUN python3 -m pip install --upgrade pip==24.0
# Install main requirements
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Create a virtual environment for audio-separator with different librosa version
RUN python3 -m venv /app/venv_separator
# Install audio-separator in the virtual environment
RUN /app/venv_separator/bin/pip install --upgrade pip && \
    /app/venv_separator/bin/pip install onnxruntime-gpu audio-separator==0.30.0

# Create a simple wrapper script for audio-separator
RUN echo '#!/bin/bash\n/app/venv_separator/bin/audio-separator "$@"' > /usr/local/bin/audio-separator && \
    chmod +x /usr/local/bin/audio-separator


RUN chmod +x /app/scripts/start.sh
VOLUME [ "/app/opt" ]
CMD ["/app/scripts/start.sh"]