from flask import Flask, jsonify, request
import whisper  # Changed from whisper_timestamped
import json
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    res = []
    try:
        data = request.json
        audios = data.get('audios')
        logger.info(f"Received request with audios: {audios}")

        if not audios:
            raise ValueError("The 'audios' is not provided in the request.")

        # Load model once outside the loop
        logger.debug("Loading model")
        model = whisper.load_model("tiny", device="cpu")

        for audio_path in audios:
            try:
                # Check if file exists
                if not os.path.exists(audio_path):
                    logger.error(f"File not found: {audio_path}")
                    res.append(({"error": f"File not found: {audio_path}"}, audio_path))
                    continue

                # Log file size and path
                file_size = os.path.getsize(audio_path)
                logger.info(f"Processing file: {audio_path} (size: {file_size} bytes)")

                # Load and transcribe the audio
                logger.debug("Loading audio file")
                audio = whisper.load_audio(audio_path)
                
                logger.debug(f"Audio loaded, shape: {audio.shape if hasattr(audio, 'shape') else 'unknown'}")
                
                logger.debug("Starting transcription")
                transcribed = model.transcribe(audio, language="en")
                
                logger.info(f"Successfully transcribed: {audio_path}")
                res.append((transcribed, audio_path))
                
            except Exception as e:
                logger.error(f"Error processing {audio_path}: {str(e)}", exc_info=True)
                res.append(({"error": str(e)}, audio_path))
                continue

        return jsonify(res)
    except Exception as e:
        logger.error(f"Global error in transcription: {str(e)}", exc_info=True)