import fs from 'fs';

const SPEECHIFY_API_URL = 'https://api.sws.speechify.com/v1/audio/speech';

async function generateSpeechifyAudio(text: string): Promise<Buffer> {
	console.log('Generating Speechify audio...');
	const response = await fetch(process.env.SPEECHIFY_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${SPEECHIFY_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			input: `<speak>${text}</speak>`,
			voice_id: '09499a56-f7ba-42f2-996d-c417289c6864',
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

	return Buffer.from(data.audio_data, 'base64');
}

async function main() {
	const audio = await generateSpeechifyAudio('Hello, world!');
	fs.writeFileSync('output.mp3', new Uint8Array(audio));
}

main();
