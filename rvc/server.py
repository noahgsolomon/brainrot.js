from flask import Flask, request, jsonify, send_from_directory
import logging
import os
import sys
import time
import traceback
import subprocess
import tempfile
import requests
from pathlib import Path
import shutil

# Ensure log directory exists
log_dir = "/app/server/logs"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "server_debug.log")

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f"Logging to file: {log_file}")

# Add progress logging for requests
logging.getLogger("urllib3").setLevel(logging.INFO)

app = Flask(__name__)

SHARED_DIR = os.environ.get('SHARED_DIR', '/app/shared_data')
os.makedirs(SHARED_DIR, exist_ok=True)

PUBLIC_DIR = '/app/public'
os.makedirs(PUBLIC_DIR, exist_ok=True)

@app.before_request
def log_request_info():
    logger.debug('Request Headers: %s', request.headers)
    logger.debug('Request Body: %s', request.get_data())
    logger.debug('Request Method: %s %s', request.method, request.path)

@app.after_request
def log_response_info(response):
    logger.debug('Response Status: %s', response.status)
    logger.debug('Response Headers: %s', response.headers)
    logger.debug('Response Body: %s', response.get_data())
    return response

# Add a simple health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    logger.info("Health check endpoint hit")
    return jsonify({"status": "healthy", "timestamp": time.time()})

@app.route('/audio-separator', methods=['POST'])
def separate_audio():
    logger.info("Audio separator endpoint called")
    try:
            
        data = request.json
        logger.debug(f"Request data: {data}")
        
        audio_url = data.get('url')
        logger.info(f"Audio URL: {audio_url}")
        
        if not audio_url:
            logger.warning("No audio URL provided")
            return jsonify({"error": "No audio URL provided"}), 400

        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.getcwd(), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Clear output directory at the start
        logger.info(f"Clearing output directory: {output_dir}")
        for file in os.listdir(output_dir):
            file_path = os.path.join(output_dir, file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                    logger.debug(f"Removed file: {file_path}")
            except Exception as e:
                logger.error(f"Error removing file {file_path}: {str(e)}")

        # Create temporary directory for files
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.debug(f"Created temp directory: {temp_dir}")
            
            # Download the audio file - add shorter timeout
            input_path = os.path.join(temp_dir, "input.wav")
            logger.info(f"Downloading audio from {audio_url} to {input_path}")
            
            try:
                # Add timeout to avoid hanging
                response = requests.get(audio_url, timeout=10)
                logger.debug(f"Download response status: {response.status_code}")
                logger.debug(f"Download response headers: {response.headers}")
                
                if response.status_code != 200:
                    logger.error(f"Failed to download audio file. Status: {response.status_code}")
                    return jsonify({"error": f"Failed to download audio file. Status: {response.status_code}"}), 500
                
                with open(input_path, 'wb') as f:
                    f.write(response.content)
                    
                logger.info(f"Audio file downloaded, size: {os.path.getsize(input_path)} bytes")
            except Exception as e:
                logger.error(f"Error downloading file: {str(e)}", exc_info=True)
                return jsonify({"error": f"Error downloading file: {str(e)}"}), 500
            
            # Use audio-separator CLI instead of the Python SDK
            logger.info(f"Separating audio from {input_path} using audio-separator CLI")
            try:
                # Add warning about processing time
                logger.warning("STARTING AUDIO SEPARATION - this can take several minutes for large files")

                start_time = time.time()
                
                # Run audio-separator command
                separator_cmd = [
                    "audio-separator",
                    input_path,
                    "-d", 
                    "--output_dir", output_dir
                ]
                
                logger.info(f"Running command: {' '.join(separator_cmd)}")
                process = subprocess.run(separator_cmd, capture_output=True, text=True, timeout=600)
                
                if process.returncode != 0:
                    logger.error(f"Audio separation failed: {process.stderr}")
                    return jsonify({"error": "Audio separation failed", "details": process.stderr}), 500
                
                logger.debug(f"Audio separation stdout: {process.stdout}")
                logger.debug(f"Audio separation stderr: {process.stderr}")
                
                end_time = time.time()
                processing_time = end_time - start_time
                logger.info(f"Separation complete in {processing_time:.2f} seconds")
                
                # Find the instrumental and vocal files in the output directory
                instrumental_file = None
                vocal_file = None
                
                logger.info(f"Looking for output files in {output_dir}")
                for file in os.listdir(output_dir):
                    logger.debug(f"Found file in output directory: {file}")
                    if os.path.isfile(os.path.join(output_dir, file)):
                        if "instrumental" in file.lower():
                            instrumental_file = os.path.join(output_dir, file)
                            logger.info(f"Found instrumental file: {instrumental_file}")
                        elif "vocals" in file.lower():
                            vocal_file = os.path.join(output_dir, file)
                            logger.info(f"Found vocal file: {vocal_file}")
                
                if not instrumental_file or not vocal_file:
                    logger.error(f"Could not find output files in {output_dir}")
                    return jsonify({"error": "Could not find output files"}), 500
                
                # Move files to shared directory with consistent names
                os.makedirs(SHARED_DIR, exist_ok=True)
                final_instrumental = os.path.join(SHARED_DIR, "instrumental.flac")
                final_vocal = os.path.join(SHARED_DIR, "vocal.flac")
                
                logger.info(f"Copying {instrumental_file} to {final_instrumental}")
                shutil.copy2(instrumental_file, final_instrumental)
                
                logger.info(f"Copying {vocal_file} to {final_vocal}")
                shutil.copy2(vocal_file, final_vocal)
                
                # Clear output directory after successful processing
                logger.info(f"Clearing output directory after processing: {output_dir}")
                for file in os.listdir(output_dir):
                    file_path = os.path.join(output_dir, file)
                    try:
                        if os.path.isfile(file_path):
                            os.unlink(file_path)
                            logger.debug(f"Removed file: {file_path}")
                    except Exception as e:
                        logger.error(f"Error removing file {file_path}: {str(e)}")
                
            except subprocess.TimeoutExpired:
                logger.error("Audio separation timed out after 10 minutes")
                return jsonify({"error": "Audio separation timed out"}), 500
            except Exception as e:
                logger.error(f"Error in audio separation process: {str(e)}", exc_info=True)
                return jsonify({"error": f"Error in audio separation process: {str(e)}"}), 500

            logger.info("Audio separation completed successfully")
            return jsonify({
                "instrumentalPath": "shared_data/instrumental.flac",
                "vocalPath": "shared_data/vocal.flac"
            })

    except Exception as e:
        logger.error(f"Unexpected error in audio separation: {str(e)}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/rvc', methods=['POST'])
def process_rvc():
    logger.info("RVC processing endpoint called")
    try:
        data = request.json
        logger.debug(f"Request data: {data}")
        
        instrumental_path = data.get('instrumentalPath')
        vocal_path = data.get('vocalPath')
        rapper = data.get('rapper')
        
        logger.info(f"Processing parameters: instrumental={instrumental_path}, vocal={vocal_path}, rapper={rapper}")

        if not all([instrumental_path, vocal_path, rapper]):
            logger.warning("Missing required parameters")
            return jsonify({"error": "Missing required parameters"}), 400

        # Adjust paths if they're relative
        if instrumental_path.startswith('shared_data/'):
            instrumental_path = os.path.join('/app', instrumental_path)
        if vocal_path.startswith('shared_data/'):
            vocal_path = os.path.join('/app', vocal_path)
            
        for path in [instrumental_path, vocal_path]:
            if not os.path.exists(path):
                logger.error(f"File not found: {path}")
                return jsonify({"error": f"File not found: {path}"}), 404
            logger.debug(f"File exists: {path}, size: {os.path.getsize(path)} bytes")

        output_dir = SHARED_DIR
        os.makedirs(output_dir, exist_ok=True)
        output_filename = f"rvc_output_vocal.wav"
        output_path = os.path.join(output_dir, output_filename)
        public_output_path = os.path.join(PUBLIC_DIR, output_filename)
        logger.debug(f"Output path: {output_path}")

        # Check for model and index files
        model_path = f"assets/weights/{rapper}.pth"
        index_path = f"logs/{rapper}/{rapper}.index"
        
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return jsonify({"error": f"Model file not found: {model_path}"}), 404
            
        if not os.path.exists(index_path):
            logger.error(f"Index file not found: {index_path}")
            return jsonify({"error": f"Index file not found: {index_path}"}), 404
            
        logger.info(f"Model files found: model={model_path}, index={index_path}")

        # Set the index_root environment variable if not already set
        if not os.getenv("index_root"):
            os.environ["index_root"] = "/app/logs"
            logger.info(f"Setting index_root environment variable to: /app/logs")
        
        if not os.getenv("weight_root"):
            os.environ["weight_root"] = "/app/weights"
            logger.info(f"Setting weight_root environment variable to: /app/weights")

        if not os.getenv("rmvpe_root"):
            os.environ["rmvpe_root"] = "/app/assets/rmvpe"
            logger.info(f"Setting rmvpe_root environment variable to: /app/assets/rmvpe")

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
        try:
            process = subprocess.run(rvc_command, capture_output=True, text=True, timeout=300)
            logger.debug(f"RVC process completed with return code: {process.returncode}")
            logger.debug(f"RVC stdout: {process.stdout}")
            
            if process.returncode != 0:
                logger.error(f"RVC processing failed: {process.stderr}")
                return jsonify({"error": "RVC processing failed", "details": process.stderr}), 500
                
            logger.debug(f"RVC stderr: {process.stderr}")
        except subprocess.TimeoutExpired:
            logger.error("RVC processing timed out after 5 minutes")
            return jsonify({"error": "RVC processing timed out"}), 500
        except Exception as e:
            logger.error(f"Error running RVC process: {str(e)}", exc_info=True)
            return jsonify({"error": f"Error running RVC process: {str(e)}"}), 500

        # Verify output file exists
        if not os.path.exists(output_path):
            logger.error(f"RVC output file was not created: {output_path}")
            return jsonify({"error": f"RVC output file was not created: {output_path}"}), 500
            
        # Copy the output file to the public directory for easier access
        try:
            shutil.copy2(output_path, public_output_path)
            logger.info(f"Copied output to public directory: {public_output_path}")
        except Exception as e:
            logger.error(f"Error copying to public directory: {str(e)}")

        # Return relative path instead of absolute path
        logger.info(f"RVC processing completed successfully, output file: {output_path}, size: {os.path.getsize(output_path)} bytes")
        return jsonify({"finalAudioPath": "shared_data/rvc_output_vocal.wav"})

    except Exception as e:
        logger.error(f"Unexpected error in RVC processing: {str(e)}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("======= Starting server =======")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Python version: {sys.version}")
    
    # Log environment variables (excluding sensitive ones)
    logger.info("Environment variables:")
    for key, value in {k: v for k, v in os.environ.items() if 'key' not in k.lower() and 'pass' not in k.lower() and 'secret' not in k.lower()}.items():
        logger.info(f"  {key}: {value}")
    
    # Log available files in key directories
    for dir_path in ['/app', '/app/logs', '/app/assets']:
        if os.path.exists(dir_path):
            logger.info(f"Files in {dir_path}:")
            for file in os.listdir(dir_path):
                logger.info(f"  {file}")
    
    # Create output directory
    output_dir = os.path.join(os.getcwd(), "output")
    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"Created output directory: {output_dir}")
    
    logger.info("Starting Flask app on host=0.0.0.0, port=5555")
    app.run(host='0.0.0.0', port=5555, debug=True) 