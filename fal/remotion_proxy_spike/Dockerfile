FROM python:3.13-slim

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/nodejs /usr/local/bin/node

WORKDIR /app
COPY bridge.py /app/bridge.py
COPY node_server.mjs /app/node_server.mjs

RUN pip install --no-cache-dir \
    fal \
    boto3==1.35.74 \
    protobuf==4.25.1 \
    pydantic==2.10.6
