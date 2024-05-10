import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// andrew-tate, joe-rogan, donald-trump, mark-zuckerberg, alex-jones, bill-gates

async function generateAudio(voice_id, person, line, index) {
	const response = await fetch('https://api.neets.ai/v1/tts', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': process.env.NEETS_API_KEY,
		},
		body: JSON.stringify({
			text: line,
			voice_id: voice_id,
			params: {
				model: 'ar-diff-50k',
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Server responded with status code ${response.status}`);
	}

	const audioStream = fs.createWriteStream(
		`public/voice/${person}-${index}.mp3`
	);
	response.body.pipe(audioStream);

	return new Promise((resolve, reject) => {
		audioStream.on('finish', () => {
			resolve('Audio file saved as output.mp3');
		});
		audioStream.on('error', reject);
	});
}

(async () => {
	await generateAudio(
		'donald-trump',
		'ROBERT_DOWNEY_JR',
		'Believe me, Bill, reinforcement learning has been tremendous from the very beginning. It started with the work of Edward Thorndike, a real winner. He discovered the law of effect, which is all about how behavior is modified based on its consequences.',
		0
	);
})();
