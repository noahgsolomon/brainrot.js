from flask import Flask, request, jsonify
import logging
import os
from audio_separator import Separator
import subprocess
import tempfile
import requests
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)


@app.route('/audio-separator', methods=['POST'])
def separate_audio():
    try:
        data = request.json
        audio_url = data.get('url')
        
        if not audio_url:
            return jsonify({"error": "No audio URL provided"}), 400


        # Create temporary directory for files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download the audio file
            input_path = os.path.join(temp_dir, "input.wav")
            response = requests.get(audio_url)
            with open(input_path, 'wb') as f:
                f.write(response.content)

            # Initialize the separator with the input file path
            logger.info(f"Initializing Separator with {input_path}")
            separator = Separator(input_path, model_name='UVR_MDXNET_KARA_2')
            
            # Create output paths
            output_dir = os.path.join(os.getcwd(), "output")
            os.makedirs(output_dir, exist_ok=True)
            
            final_instrumental = os.path.join(output_dir, f"instrumental_{Path(input_path).stem}.wav")
            final_vocal = os.path.join(output_dir, f"vocal_{Path(input_path).stem}.wav")
            
            # Separate the audio - using the correct API
            logger.info(f"Separating audio from {input_path}")
            # The separate method returns primary and secondary stem paths
            instrumental_path, vocal_path = separator.separate()
            
            # Move or copy the output files if needed
            if instrumental_path != final_instrumental:
                os.rename(instrumental_path, final_instrumental)
            if vocal_path != final_vocal:
                os.rename(vocal_path, final_vocal)

            return jsonify({
                "instrumentalPath": final_instrumental,
                "vocalPath": final_vocal
            })

    except Exception as e:
        logger.error(f"Error in audio separation: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/rvc', methods=['POST'])
def process_rvc():
    try:
        data = request.json
        instrumental_path = data.get('instrumentalPath')
        vocal_path = data.get('vocalPath')
        rapper = data.get('rapper')

        if not all([instrumental_path, vocal_path, rapper]):
            return jsonify({"error": "Missing required parameters"}), 400

        # Process vocals with RVC
        output_dir = os.path.join(os.getcwd(), "output")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"rvc_output_{Path(vocal_path).stem}.wav")

        # Construct RVC command
        rvc_command = [
            "python", "tools/infer_cli.py",
            "--input_path", vocal_path,
            "--model_name", f"{rapper}.pth",
            "--index_path", f"logs/{rapper}/{rapper}.index",
            "--f0up_key", "0",
            "--f0method", "rmvpe",
            "--opt_path", output_path,
            "--index_rate", "0.75",
            "--filter_radius", "3",
            "--resample_sr", "0",
            "--rms_mix_rate", "0.25",
            "--protect", "0.33"
        ]

        # Run RVC processing
        logger.info(f"Running RVC command: {' '.join(rvc_command)}")
        process = subprocess.run(rvc_command, capture_output=True, text=True)
        
        if process.returncode != 0:
            logger.error(f"RVC processing failed: {process.stderr}")
            return jsonify({"error": "RVC processing failed", "details": process.stderr}), 500

        # TODO: Add audio mixing of instrumental and processed vocals here if needed

        return jsonify({
            "finalAudioPath": output_path
        })

    except Exception as e:
        logger.error(f"Error in RVC processing: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5555) 