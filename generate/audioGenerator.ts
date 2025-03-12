import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const SPEECHIFY_API_URL = 'https://api.sws.speechify.com/v1/audio/speech';

export async function generateAudio(
	voice_id: string,
	person: string,
	line: string,
	index: number
) {
	const response = await fetch(`${SPEECHIFY_API_URL}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.SPEECHIFY_API_KEY}`,
		},
		body: JSON.stringify({
			input: `<speak>${line}</speak>`,
			voice_id: voice_id,
			audio_format: 'mp3',
		}),
	});

	if (!response.ok) {
		throw new Error(`Server responded with status code ${response.status}`);
	}

	const data = await response.json();
	if (!data.audio_data) {
		throw new Error('No audio data received from Speechify');
	}

	// Convert base64 audio data to buffer
	const audioBuffer = Buffer.from(data.audio_data, 'base64');

	// Write the buffer to a file
	fs.writeFileSync(`public/voice/${person}-${index}.mp3`, audioBuffer);

	return Promise.resolve('Audio file saved successfully');
}
