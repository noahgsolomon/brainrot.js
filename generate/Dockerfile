FROM python:3.9

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

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

COPY requirements.txt /app/brainrot/
RUN cd /app/brainrot/ && pip3 install -r requirements.txt

COPY setup.py /app/brainrot/setup.py
COPY whisper_timestamped /app/brainrot/whisper_timestamped

RUN cd /app/brainrot/ && pip3 install ".[dev]"

RUN pip3 install \
    torch==1.13.1+cpu \
    torchaudio==0.13.1+cpu \
    -f https://download.pytorch.org/whl/torch_stable.html

RUN pip3 install gunicorn

COPY . /app/brainrot

RUN npm install pm2 -g
RUN npm install

ENTRYPOINT ["gunicorn"]
CMD ["-w", "1", "-b", "0.0.0.0:5000", "--access-logfile", "access.log", "--error-logfile", "error.log", "transcribe:app", "--daemon", "--timeout", "120"]