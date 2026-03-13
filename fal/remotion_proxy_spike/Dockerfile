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
COPY fal/remotion_proxy_spike/package.json /app/package.json
RUN cd /app && npm install
COPY fal/remotion_proxy_spike/remotion_runtime/package.json /app/remotion_runtime/package.json
RUN cd /app/remotion_runtime && npm install
COPY fal/remotion_proxy_spike/remotion_runtime/src /app/remotion_runtime/src
COPY training_audio /app/training_audio
COPY generate/public/music /app/remotion_runtime/public/music
COPY fal/remotion_proxy_spike/bridge.py /app/bridge.py
COPY fal/remotion_proxy_spike/node_server.mjs /app/node_server.mjs
COPY fal/remotion_proxy_spike/job_callbacks.mjs /app/job_callbacks.mjs
COPY fal/remotion_proxy_spike/brainrot_transcript_audio.mjs /app/brainrot_transcript_audio.mjs
COPY fal/remotion_proxy_spike/minimax_voice_registry.mjs /app/minimax_voice_registry.mjs
COPY fal/remotion_proxy_spike/remotion_black_render.mjs /app/remotion_black_render.mjs

RUN pip install --no-cache-dir \
    fal \
    boto3==1.35.74 \
    protobuf==4.25.1 \
    pydantic==2.10.6
