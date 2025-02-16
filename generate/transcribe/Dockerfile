FROM python:3.9-slim

# Install only the required system dependencies for transcription
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        build-essential \
        python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python3 -m pip install --upgrade pip

# Set working directory
WORKDIR /app/video

# Copy only the necessary Python files
COPY requirements.txt /app/video/
COPY setup.py /app/video/setup.py
COPY whisper_timestamped /app/video/whisper_timestamped

# Install Python dependencies
RUN pip3 install -r requirements.txt && \
    pip3 install ".[dev]" && \
    pip3 install --no-cache-dir \
    torch==1.13.1 \
    torchaudio==0.13.1 \
    --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip3 install gunicorn

# Copy only the transcription service file
COPY transcribe.py /app/video/

# Clean up unnecessary files and caches
RUN pip cache purge && \
    rm -rf /root/.cache/pip/*

# Expose the port used by Flask
EXPOSE 5005

# Command to run the transcription service
CMD ["gunicorn", "--bind", "0.0.0.0:5005", "transcribe:app"]