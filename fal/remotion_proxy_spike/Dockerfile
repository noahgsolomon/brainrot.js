FROM python:3.13-slim

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/nodejs /usr/local/bin/node

WORKDIR /app
COPY fal/remotion_proxy_spike/package.json /app/package.json
RUN cd /app && npm install
COPY generate/package.json /app/generate/package.json
RUN cd /app/generate && npm install --legacy-peer-deps
COPY generate/src /app/generate/src
COPY generate/public /app/generate/public
COPY generate/tsconfig.json /app/generate/tsconfig.json
COPY generate/remotion.config.ts /app/generate/remotion.config.ts
COPY generate/tailwind.config.js /app/generate/tailwind.config.js
COPY training_audio /app/training_audio
COPY fal/remotion_proxy_spike/bridge.py /app/bridge.py
COPY fal/remotion_proxy_spike/node_server.mjs /app/node_server.mjs
COPY fal/remotion_proxy_spike/job_callbacks.mjs /app/job_callbacks.mjs
COPY fal/remotion_proxy_spike/brainrot_transcript_audio.mjs /app/brainrot_transcript_audio.mjs
COPY fal/remotion_proxy_spike/pitch_mode_audio.mjs /app/pitch_mode_audio.mjs
COPY fal/remotion_proxy_spike/minimax_voice_registry.mjs /app/minimax_voice_registry.mjs
COPY fal/remotion_proxy_spike/python_srt_pipeline.mjs /app/python_srt_pipeline.mjs
COPY fal/remotion_proxy_spike/transcribe_and_generate_srt.py /app/transcribe_and_generate_srt.py
COPY fal/remotion_proxy_spike/remotion_brainrot_lambda_render.mjs /app/remotion_brainrot_lambda_render.mjs
COPY fal/remotion_proxy_spike/brainrot_prep_upload.mjs /app/brainrot_prep_upload.mjs

RUN pip install --no-cache-dir \
    fal \
    boto3==1.35.74 \
    protobuf==4.25.1 \
    pydantic==2.10.6
