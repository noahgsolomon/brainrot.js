import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import transcriptFunction from './transcript.mjs';
import { writeFile } from 'fs/promises';

dotenv.config();

export async function generateTranscriptAudio(topic, agentA, agentB) {
	let transcript = (await transcriptFunction(topic, agentA, agentB)).transcript;

	const audios = [];

	for (let i = 0; i < transcript.length; i++) {
		const person = transcript[i].person;
		const line = transcript[i].line;

		const voice_id =
			person === 'JOE_ROGAN'
				? process.env.JOE_ROGAN_VOICE_ID
				: person === 'BARACK_OBAMA'
				? process.env.BARACK_OBAMA_VOICE_ID
				: person === 'BEN_SHAPIRO'
				? process.env.BEN_SHAPIRO_VOICE_ID
				: person === 'RICK_SANCHEZ'
				? process.env.RICK_SANCHEZ_VOICE_ID
				: process.env.JORDAN_PETERSON_VOICE_ID;

		const image = await fetchValidImage(transcript, i);

		await generateAudio(voice_id, person, line, i);
		audios.push({
			person: person,
			audio: `public/voice/${person}-${i}.mp3`,
			index: i,
			image: image.link,
		});
	}

	const initialAgentName = audios[0].person;

	const contextContent = `
import { staticFile } from 'remotion';

export const initialAgentName = '${initialAgentName}';
export const videoFileName = 'https://images.smart.wtf/brainrot-' + ${Math.floor(
		Math.random() * 23
	)} + '.mp4';
export const subtitlesFileName = [
  ${audios
		.map(
			(entry, i) => `{
    name: '${entry.person}',
    file: staticFile('srt/${entry.person}-${i}.srt'),
    asset: '${entry.image}',
  }`
		)
		.join(',\n  ')}
];
`;

	await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');

	return audios;
}

export async function generateAudio(voice_id, person, line, index) {
	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
		{
			method: 'POST',
			headers: {
				'xi-api-key': process.env.ELEVEN_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model_id: 'eleven_multilingual_v2',
				text: line,
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75,
				},
			}),
		}
	);

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

async function fetchValidImage(transcript, index, attempt = 0) {
	const maxAttempts = 5;
	const numImages = 4;

	if (attempt >= maxAttempts) {
		return 'https://images.smart.wtf/black.png';
	}

	const imageFetch = await fetch(
		`https://www.googleapis.com/customsearch/v1?q=${encodeURI(
			transcript[index].asset
		)}&cx=${process.env.GOOGLE_CX}&searchType=image&key=${
			process.env.GOOGLE_API_KEY
		}&num=${numImages}`,
		{
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		}
	);

	const imageResponse = await imageFetch.json();

	if (!imageResponse.items || imageResponse.items.length === 0) {
		return await fetchValidImage(transcript, index, attempt + 1);
	}

	const validMimeTypes = ['image/png', 'image/jpeg'];
	for (let image of imageResponse.items) {
		if (validMimeTypes.includes(image.mime)) {
			const isViewable = await checkImageHeaders(image.link);
			if (isViewable) {
				return image;
			}
		}
	}

	return await fetchValidImage(transcript, index, attempt + 1);
}

async function checkImageHeaders(url) {
	try {
		const response = await fetch(url, { method: 'HEAD' });
		const contentType = response.headers.get('Content-Type');
		const contentDisposition = response.headers.get('Content-Disposition');

		// Check for direct image content types and absence of attachment disposition
		if (
			contentType.includes('image/png') ||
			contentType.includes('image/jpeg')
		) {
			if (!contentDisposition || !contentDisposition.includes('attachment')) {
				return true; // Image is likely viewable directly in the browser
			}
		}
	} catch (error) {
		console.error('Error checking image headers:', error);
	}
	return false;
}
