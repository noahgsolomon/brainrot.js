import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import transcriptFunction from './transcript';
import { writeFile } from 'fs/promises';
import { query } from './dbClient';

dotenv.config();

export async function generateTranscriptAudio({
	local,
	topic,
	agentA,
	agentB,
	music,
	videoId,
	mode = 'brainrot',
}: {
	local: boolean;
	topic: string;
	agentA: string;
	agentB: string;
	music: string;
	videoId?: string;
	mode?: 'brainrot' | 'podcast' | 'monologue';
}) {
	console.log('⭐ Starting generateTranscriptAudio with params:', {
		local,
		topic,
		agentA,
		mode,
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
			});
		}

		const initialAgentName = audios[0].person;

		const contextContent = `
import { staticFile } from 'remotion';

export const music: string = ${
			music === 'NONE' ? `'NONE'` : `'/music/${music}.MP3'`
		};
export const initialAgentName = '${initialAgentName}';
export const useBackground = ${mode === 'brainrot'};
${
	mode === 'brainrot'
		? "export const videoFileName = '/background/MINECRAFT-0.mp4';"
		: ''
}
export const videoMode = '${mode}';

export const subtitlesFileName = [
  ${audios
		.map(
			(entry, i) => `{
    name: '${entry.person}',
    file: staticFile('srt/${entry.person}-${i}.srt'),
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
