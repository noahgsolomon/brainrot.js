import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import transcriptFunction from './transcript.mjs';
import { writeFile } from 'fs/promises';
import { query } from './dbClient.mjs';

dotenv.config();

import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Add logging at import time
console.log('🔄 Initializing eleven.mjs module');

export async function generateTranscriptAudio(
	local,
	topic,
	agentA,
	agentB,
	ai,
	fps,
	duration,
	background,
	music,
	videoId
) {
	console.log('⭐ Starting generateTranscriptAudio with params:', {
		local,
		topic,
		agentA,
		agentB,
		ai,
		duration,
	});

	try {
		if (!local) {
			console.log('📝 Updating video status - Generating transcript');
			await query(
				"UPDATE `pending-videos` SET status = 'Generating transcript', progress = 0 WHERE video_id = ?",
				[videoId]
			);
		}

		console.log('📜 Getting transcript from transcriptFunction');
		let transcript = (await transcriptFunction(topic, agentA, agentB, duration))
			.transcript;
		console.log('✅ Transcript generated:', transcript.length, 'entries');

		const audios = [];

		if (!local) {
			console.log('📝 Updating video status - Fetching images');
			await query(
				"UPDATE `pending-videos` SET status = 'Fetching images', progress = 5 WHERE video_id = ?",
				[videoId]
			);
		}

		console.log('🖼️ Starting fetchValidImages');
		const images = await fetchValidImages(
			transcript,
			transcript.length,
			ai,
			duration
		);
		console.log('✅ Images fetched:', images.length);

		if (!local) {
			await query(
				"UPDATE `pending-videos` SET status = 'Generating audio', progress = 12 WHERE video_id = ?",
				[videoId]
			);
		}

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
					: person === 'DONALD_TRUMP'
					? process.env.DONALD_TRUMP_VOICE_ID
					: person === 'JOE_BIDEN'
					? process.env.JOE_BIDEN_VOICE_ID
					: person === 'KAMALA_HARRIS'
					? process.env.KAMALA_HARRIS_VOICE_ID
					: person === 'ANDREW_TATE'
					? process.env.ANDREW_TATE_VOICE_ID
					: process.env.JORDAN_PETERSON_VOICE_ID;

			await generateAudio(voice_id, person, line, i);
			audios.push({
				person: person,
				audio: `public/voice/${person}-${i}.mp3`,
				index: i,
				image:
					ai && duration === 1
						? images[i].imageUrl
						: images[i]?.link || 'https://images.smart.wtf/black.png',
			});
		}

		const initialAgentName = audios[0].person;

		const contextContent = `
import { staticFile } from 'remotion';

export const music: string = ${
			music === 'NONE' ? `'NONE'` : `'/music/${music}.MP3'`
		};
export const fps = ${fps};
export const initialAgentName = '${initialAgentName}';
export const videoFileName = '/background/MINECRAFT-0.mp4';


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

		return { audios, transcript };
	} catch (error) {
		console.error('❌ Error in generateTranscriptAudio:', error);
		throw error;
	}
}

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

async function fetchValidImages(transcript, length, ai, duration) {
	console.log('🔍 Starting fetchValidImages with params:', {
		length,
		ai,
		duration,
	});

	if (ai && duration === 1) {
		console.log('🤖 Using AI image generation');
		const promises = [];

		for (let i = 0; i < length; i++) {
			console.log(
				`📸 Queueing image generation for transcript ${i}:`,
				transcript[i].asset
			);
			promises.push(imageGeneneration(transcript[i].asset));
		}

		console.log('⏳ Waiting for all image generations to complete');
		const aiImages = await Promise.all(promises);
		console.log('✅ AI images generated:', aiImages.length);
		return aiImages;
	} else {
		console.log('🔎 Using Google image search');
		const images = [];
		for (let i = 0; i < length; i++) {
			const imageFetch = await fetch(
				`https://www.googleapis.com/customsearch/v1?q=${encodeURI(
					transcript[i].asset
				)}&cx=${process.env.GOOGLE_CX}&searchType=image&key=${
					process.env.GOOGLE_API_KEY
				}&num=${4}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				}
			);
			const imageResponse = await imageFetch.json();

			// Check if the response contains 'items' and they are iterable
			if (
				!Array.isArray(imageResponse.items) ||
				imageResponse.items.length === 0
			) {
				console.log(
					'No images found or items not iterable',
					imageResponse.items
				);
				images.push({ link: 'https://images.smart.wtf/black.png' });
				continue; // Skip to the next iteration
			}

			const validMimeTypes = ['image/png', 'image/jpeg'];
			let imageAdded = false;

			for (let image of imageResponse.items) {
				if (validMimeTypes.includes(image.mime)) {
					const isViewable = await checkImageHeaders(image.link);
					if (isViewable) {
						images.push(image);
						imageAdded = true;
						break; // Stop after adding one valid image
					}
				}
			}

			// If no valid images were added, push a default image
			if (!imageAdded) {
				images.push({ link: 'https://images.smart.wtf/black.png' });
			}
		}

		return images;
	}
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

const imagePrompt = async (title) => {
	console.log('💭 Generating image prompt for:', title);
	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: title }],
		});
		console.log('✅ Prompt generated:', response.choices[0]?.message.content);
		return response.choices[0]?.message.content;
	} catch (error) {
		console.error('❌ Error generating prompt:', error);
		throw error;
	}
};

const imageGeneneration = async (initialPrompt) => {
	console.log('🎨 Starting image generation for prompt:', initialPrompt);
	try {
		console.log('1️⃣ Getting AI prompt');
		const prompt = await imagePrompt(initialPrompt);

		console.log('2️⃣ Building full prompt');
		const detailed8BitPreface =
			'Create an image in a detailed retro 8-bit style. The artwork should have a pixelated texture and should have vibrant coloring and scenery.';

		let fullPrompt = `${detailed8BitPreface} ${prompt} Remember, this is in retro 8-bit style`;
		fullPrompt = fullPrompt.substring(0, 900);

		console.log('3️⃣ Calling DALL-E API');
		const responseFetch = await openai.images.generate({
			model: 'dall-e-3',
			prompt: fullPrompt,
			n: 1,
			size: '1024x1024',
			quality: 'standard',
			style: 'vivid',
			response_format: 'url',
			user: 'user-1234',
		});

		console.log('✅ Image generated successfully');
		return {
			imageUrl: responseFetch.data[0]?.url,
			initialPrompt: initialPrompt,
			prompt: prompt,
		};
	} catch (error) {
		console.error('❌ Error in imageGeneration:', error);
		return {
			imageUrl: 'https://images.smart.wtf/black.png',
			initialPrompt: initialPrompt,
			prompt: 'Error occurred during image generation',
		};
	}
};
