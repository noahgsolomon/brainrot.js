FROM python:3.9-slim

# Install basic dependencies first
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg2 \
    unzip \
    build-essential \
    && apt-get clean

# Install Node.js and npm for ARM
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install bun and add to PATH
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        vim \
        ca-certificates \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        lsb-release \
        wget \
        xdg-utils

RUN python3 -m pip install --upgrade pip

WORKDIR /app/brainrot

# Copy package files first to leverage Docker cache
COPY ./package*.json /app/brainrot/

# Python setup
COPY transcribe/requirements.txt /app/brainrot/
RUN cd /app/brainrot/ && pip3 install -r requirements.txt

COPY transcribe/setup.py /app/brainrot/setup.py
COPY transcribe/transcribe.py /app/brainrot/transcribe.py
COPY transcribe/whisper_timestamped /app/brainrot/whisper_timestamped

RUN cd /app/brainrot/ && pip3 install ".[dev]"

RUN pip3 install \
    torch==1.13.1 \
    torchaudio==0.13.1 \
    --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip3 install gunicorn

# Copy the rest of the application
COPY . /app/brainrot

RUN rm -rf /app/brainrot/node_modules
RUN rm -f /app/brainrot/package-lock.json
RUN rm -f /app/brainrot/bun.lockb

RUN bun install 
RUN bun install -g pm2

RUN chmod +x /app/brainrot/scripts/generate.sh

CMD ["/app/brainrot/scripts/generate.sh"]