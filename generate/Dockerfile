FROM python:3.9

# Add retry logic and multiple mirrors for more reliable package installation
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
    echo "deb http://deb.debian.org/debian bookworm main\ndeb http://deb.debian.org/debian-security bookworm-security main\ndeb http://deb.debian.org/debian bookworm-updates main" > /etc/apt/sources.list

# Install Node.js with proper repository setup
RUN apt-get update && apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Install system dependencies with retry logic
RUN apt-get update && apt-get clean && \
    for i in $(seq 1 3); do \
        apt-get update && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
            ffmpeg \
            vim \
            ca-certificates \
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
            xdg-utils && \
        apt-get clean && \
        rm -rf /var/lib/apt/lists/* && \
        break || \
        if [ $i -lt 3 ]; then sleep 5; fi; \
    done

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    ffmpeg -version

RUN python3 -m pip install --upgrade pip

WORKDIR /app/brainrot

COPY requirements.txt /app/brainrot/
RUN cd /app/brainrot/ && pip3 install -r requirements.txt

COPY setup.py /app/brainrot/setup.py
COPY whisper_timestamped /app/brainrot/whisper_timestamped

RUN cd /app/brainrot/ && pip3 install ".[dev]"

RUN pip3 install \
    torch==1.13.1 \
    torchaudio==0.13.1 \
    --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip3 install gunicorn

COPY . /app/brainrot

RUN npm install pm2 -g
RUN npm install

RUN npm install -g browserslist caniuse-lite && \
    npm update -g caniuse-lite

ENTRYPOINT ["gunicorn"]
CMD ["-w", "1", "-b", "0.0.0.0:5000", "--access-logfile", "access.log", "--error-logfile", "error.log", "transcribe:app", "--daemon", "--timeout", "120"]