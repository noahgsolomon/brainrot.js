FROM python:3.9

# Configure apt for reliability
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
    echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid-until && \
    echo 'APT::Get::Assume-Yes "true";' > /etc/apt/apt.conf.d/90assume-yes && \
    echo 'Acquire::CompressionTypes::Order:: "gz";' > /etc/apt/apt.conf.d/99compression-workaround

# Install Node.js with proper repository setup
RUN rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    apt-get update --fix-missing && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Install system dependencies with retry mechanism
RUN for i in {1..3}; do \
        apt-get update --fix-missing && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
            vim \
            wget \
            ca-certificates \
            lsb-release \
            xdg-utils \
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
            fonts-liberation \
            libasound2 \
            libatk-bridge2.0-0 \
            libatk1.0-0 \
            libcairo2 \
            libcups2 \
            libdbus-1-3 \
            libexpat1 \
            libfontconfig1 \
            libgbm1 \
            libglib2.0-0 \
            libgtk-3-0 \
            libnspr4 \
            libnss3 \
            libpango-1.0-0 \
            libpangocairo-1.0-0 \
            libstdc++6 && break || \
        if [ $i -lt 3 ]; then \
            sleep 5; \
            apt-get clean; \
            rm -rf /var/lib/apt/lists/*; \
        fi; \
    done

# Install ffmpeg and its dependencies with retry mechanism
RUN for i in {1..3}; do \
        apt-get update --fix-missing && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
            ffmpeg \
            libavutil57 \
            libavcodec59 \
            libavformat59 \
            libavdevice59 \
            libavfilter8 \
            libswscale6 \
            libswresample4 \
            libpostproc56 && \
        ldconfig && \
        ffmpeg -version && break || \
        if [ $i -lt 3 ]; then \
            sleep 5; \
            apt-get clean; \
            rm -rf /var/lib/apt/lists/*; \
        fi; \
    done && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*


RUN apt-get update && \
    apt-get install -y software-properties-common && \
    apt-get install -y wget && \
    wget -O /etc/apt/trusted.gpg.d/debian-multimedia.gpg https://www.deb-multimedia.org/pool/main/d/deb-multimedia-keyring/deb-multimedia-keyring_2016.8.1_all.deb && \
    echo "deb http://www.deb-multimedia.org stable main" | tee /etc/apt/sources.list.d/multimedia.list && \
    apt-get update -oAcquire::AllowInsecureRepositories=true && \
    apt-get install -y --allow-unauthenticated deb-multimedia-keyring && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ffmpeg \
        libavutil57 \
        libavcodec59 \
        libavformat59 \
        libavdevice59 \
        libavfilter8 \
        libswscale6 \
        libswresample4 \
        libpostproc56 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ldconfig && \
    ffmpeg -version

# Set up Python environment
RUN python3 -m pip install --upgrade pip

WORKDIR /app/brainrot

# Install Python dependencies
COPY requirements.txt /app/brainrot/
RUN pip3 install -r requirements.txt

# Install whisper_timestamped
COPY setup.py /app/brainrot/setup.py
COPY whisper_timestamped /app/brainrot/whisper_timestamped
RUN pip3 install ".[dev]"

# Install PyTorch CPU version
RUN pip3 install \
    torch==1.13.1 \
    torchaudio==0.13.1 \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Install Gunicorn
RUN pip3 install gunicorn

# Copy application code
COPY . /app/brainrot

# Install Node.js dependencies
RUN npm install pm2 -g && \
    npm install && \
    npm install -g browserslist caniuse-lite && \
    npm update -g caniuse-lite

# Verify audio directory exists and has proper permissions
RUN mkdir -p /app/brainrot/public/voice && \
    chmod -R 755 /app/brainrot/public

# Set up Gunicorn
ENTRYPOINT ["gunicorn"]
CMD ["transcribe:app", "-w", "1", "-b", "0.0.0.0:5000", "--access-logfile", "access.log", "--error-logfile", "error.log", "--timeout", "120"]