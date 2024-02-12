from flask import Flask, jsonify, request
import whisper_timestamped as whisper
import json

app = Flask(__name__)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    res = []
    try:
        data = request.json
        audios = data.get('audios')

        if not audios:
            raise ValueError("The 'audios' is not provided in the request.")

        for audio_path in audios:
            # Load and transcribe the audio
            audio = whisper.load_audio(audio_path)
            model = whisper.load_model("tiny", device="cpu")
            transcribed = whisper.transcribe(model, audio, language="en")
            res.append((transcribed, audio_path))
        return jsonify(res)
    except Exception as e:
        app.logger.error(f'An error occurred during transcription: {e}')
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
