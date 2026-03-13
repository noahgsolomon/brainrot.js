FROM python:3.13-slim

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ffmpeg \
    chromium \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/nodejs /usr/local/bin/node

ENV REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium

WORKDIR /app
COPY remotion_runtime/package.json /app/remotion_runtime/package.json
RUN cd /app/remotion_runtime && npm install
COPY remotion_runtime/src /app/remotion_runtime/src
COPY bridge.py /app/bridge.py
COPY node_server.mjs /app/node_server.mjs
COPY job_callbacks.mjs /app/job_callbacks.mjs
COPY brainrot_transcript_audio.mjs /app/brainrot_transcript_audio.mjs
COPY remotion_black_render.mjs /app/remotion_black_render.mjs

RUN pip install --no-cache-dir \
    fal \
    boto3==1.35.74 \
    protobuf==4.25.1 \
    pydantic==2.10.6
