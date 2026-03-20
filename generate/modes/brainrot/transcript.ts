import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk';
import { query } from '../../dbClient';
import { writeFile } from 'fs/promises';
import { generateAudio } from '../../audioGenerator';
import { generateFillerContext } from '../../fillerContext';

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

function getMinimumExchangeCount(agents: string[]) {
	return Math.max(5, agents.length * 2);
}

async function generateBrainrotTranscript(
	topic: string,
	agents: string[]
) {
	console.log('📝 Starting generateTranscript with params:', {
		topic,
		agents,
	});

	try {
		console.log('🤖 Creating Groq chat completion...');
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `Create a dialogue for a short-form conversation on the topic of ${topic}. The conversation should include these agents: ${agents
						.map((agent) => agent.split('_').join(' '))
						.join(', ')}. Every selected agent should speak at least once. Use a minimum of ${getMinimumExchangeCount(
						agents
					)} exchanges, and when there are many selected agents, let the conversation run longer so multiple speakers get multiple turns instead of rushing to the finish. There is no hard maximum exchange count. They should act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. The dialogue should still provide insights into ${topic} but do so in the most profane and shocking way possible. The agentId attribute must be one of ${agents.join(
						', '
					)}. The JSON format WHICH MUST BE ADHERED TO ALWAYS is as follows: { "transcript": [ { "agentId": "${
						agents[0]
					}", "text": "their line of conversation in the dialog" } ] }`,
				},
				{
					role: 'user',
					content: `generate a video about ${topic}. Every selected agent should talk about it in a way they would, but extremify their qualities and make the conversation risque so that it would be interesting to watch and edgy. If there are lots of speakers, make the conversation substantially longer instead of wrapping up quickly.`,
				},
			],
			response_format: { type: 'json_object' },
			model: 'llama3-70b-8192',
			temperature: 0.5,
			max_tokens: 4096,
			top_p: 1,
			stop: null,
			stream: false,
		});

		console.log('✅ Chat completion received');
		const content = completion.choices[0]?.message?.content || '';
		console.log('📄 Content:', content);
		console.log('📄 Content length:', content.length);

		return content;
	} catch (error) {
		console.error('❌ Error in generateTranscript:', error);
		throw error;
	}
}

function delay(ms: number) {
	console.log(`⏳ Delaying for ${ms}ms`);
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function brainrotTranscript(
	topic: string,
	agents: string[]
) {
	console.log('🎬 Starting transcriptFunction with params:', {
		topic,
		agents,
	});

	let transcript: Transcript[] | null = null;
	let attempts = 0;

	while (attempts < 5) {
		console.log(`🔄 Attempt ${attempts + 1}/5`);
		try {
			console.log('📝 Generating transcript...');
			const content = await generateBrainrotTranscript(topic, agents);

			console.log('🔍 Parsing content...');
			const parsedContent = content === '' ? null : JSON.parse(content);
			// Extract the transcript array from the response
			transcript = parsedContent?.transcript || null;

			if (transcript !== null && Array.isArray(transcript)) {
				const validAgentIds = new Set(agents);
				const presentAgentIds = new Set<string>();
				for (const entry of transcript) {
					if (!validAgentIds.has(entry.agentId)) {
						throw new Error(`Unexpected agentId in transcript: ${entry.agentId}`);
					}
					presentAgentIds.add(entry.agentId);
				}

				const missingAgents = agents.filter((agent) => !presentAgentIds.has(agent));
				if (missingAgents.length > 0) {
					throw new Error(
						`Transcript did not include every selected agent: ${missingAgents.join(', ')}`
					);
				}

				console.log('✅ Valid transcript generated');
				console.log('📜 Transcript lines:');
				transcript.forEach((entry, index) => {
					console.log(`${index + 1}. ${entry.agentId}: "${entry.text}"`);
				});
				return transcript;
			} else {
				console.log('⚠️ Invalid or empty transcript received');
			}
		} catch (error) {
			console.error(`❌ Attempt ${attempts + 1} failed:`, error);
			console.log('⏳ Waiting before next attempt...');
			await delay(15000);
		}
		attempts++;
	}

	console.error('❌ All attempts failed');
	throw new Error(
		`Failed to generate valid transcript after 5 attempts for topic: ${topic}`
	);
}

export async function generateBrainrotTranscriptAudio({
	local,
	topic,
	agents,
	agentA,
	agentB,
	music,
	videoId,
}: {
	local: boolean;
	topic: string;
	agents?: string[];
	agentA: string;
	agentB: string;
	music: string;
	videoId?: string;
}) {
	console.log('⭐ Starting generateTranscriptAudio with params:', {
		local,
		topic,
		agents,
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
		const selectedAgents =
			agents && agents.length >= 2 ? agents : [agentA, agentB];
		let transcript = (await brainrotTranscript(
			topic,
			selectedAgents
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

		let contextContent = `
import { staticFile } from 'remotion';

export const music: string = ${
			music === 'NONE' ? `'NONE'` : `'/music/${music}.MP3'`
		};
export const initialAgentName = '${initialAgentName}';
export const videoFileName = '/background/MINECRAFT-1.mp4';
export const videoMode = 'brainrot';
export const speakerOrder = ${JSON.stringify(selectedAgents)};
export const dialogueEmotions = ${JSON.stringify(
			transcript.map((entry, entryIndex) => ({
				entryIndex,
				agentId: entry.agentId,
				emotion: 'neutral',
				reason: 'legacy-local-default',
			}))
		)};
export const slowModeIntervals = [];

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

		contextContent += generateFillerContext('brainrot');

		await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');

		return { audios, transcript };
	} catch (error) {
		console.error('❌ Error in generateTranscriptAudio:', error);
		throw error;
	}
}
