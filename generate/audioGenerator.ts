import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import transcriptFunction from './transcript';
import { writeFile } from 'fs/promises';
import { query } from './dbClient';

dotenv.config();

import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTranscriptAudio({
	local,
	topic,
	agentA,
	agentB,
	fps,
	music,
	videoId,
	mode = 'brainrot',
	useBackground = true,
}: {
	local: boolean;
	topic: string;
	agentA: string;
	agentB: string;
	fps: number;
	music: string;
	videoId: string;
	mode?: 'brainrot' | 'podcast' | 'monologue';
	useBackground?: boolean;
}) {
	console.log('⭐ Starting generateTranscriptAudio with params:', {
		local,
		topic,
		agentA,
		mode,
		useBackground,
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
		let transcript = (await transcriptFunction(
			topic,
			agentA,
			agentB
		)) as Transcript[];
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
		const images = await fetchValidImages(transcript, transcript.length);
		console.log('✅ Images fetched:', images.length);

		if (!local) {
			await query(
				"UPDATE `pending-videos` SET status = 'Generating audio', progress = 12 WHERE video_id = ?",
				[videoId]
			);
		}

		for (let i = 0; i < transcript.length; i++) {
			const person = transcript[i].agentId;
			const line = transcript[i].text;

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

			await generateAudio(voice_id ?? '', person, line, i);
			audios.push({
				person: person,
				audio: `public/voice/${person}-${i}.mp3`,
				index: i,
				image: images[i].imageUrl,
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
export const useBackground = ${mode === 'brainrot'};
${mode === 'brainrot' ? "export const videoFileName = '/background/MINECRAFT-0.mp4';" : ''}
export const videoMode = '${mode}';

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

async function generateAudio(
	voice_id: string,
	person: string,
	line: string,
	index: number
) {
	const response = await fetch('https://api.neets.ai/v1/tts', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': process.env.NEETS_API_KEY ?? '',
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

async function fetchValidImages(transcript: Transcript[], length: number) {
	console.log('🔍 Starting fetchValidImages with params:', {
		length,
	});

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
}

const imagePrompt = async (title: string) => {
	console.log('💭 Generating image prompt for:', title);
	try {
		const response = await openai.chat.completions.create({
			model: 'ft:gpt-3.5-turbo-1106:personal::8TEhcfKm',
			messages: [{ role: 'user', content: title }],
		});
		console.log('✅ Prompt generated:', response.choices[0]?.message.content);
		return response.choices[0]?.message.content;
	} catch (error) {
		console.error('❌ Error generating prompt:', error);
		throw error;
	}
};

const imageGeneneration = async (initialPrompt: string) => {
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
