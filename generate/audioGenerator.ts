import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://api.sws.speechify.com';

export async function generateAudio(
	voice_id: string,
	person: string,
	line: string,
	index: number
) {
	const response = await fetch(`${API_BASE_URL}/v1/tts`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${process.env.SPEECHIFY_API_KEY}`,
		},
		body: JSON.stringify({
			text: line,
			voice_id: voice_id,
			output_format: 'mp3',
			sample_rate: 24000,
			speed: 1.0
		}),
	});

	if (!response.ok) {
		throw new Error(`Server responded with status code ${response.status}`);
	}

	// Get the audio buffer from the response
	const audioBuffer = await response.buffer();

	// Write the buffer to a file
	fs.writeFileSync(`public/voice/${person}-${index}.mp3`, audioBuffer);

	return Promise.resolve('Audio file saved successfully');
}
