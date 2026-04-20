import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk';
import { query } from '../../dbClient';
import { writeFile } from 'fs/promises';
import { generateAudio } from '../../audioGenerator';

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

const TARGET_DURATION_MIN_SECONDS = 60;
const TARGET_DURATION_MAX_SECONDS = 120;
const TARGET_DURATION_IDEAL_SECONDS = 90;
const TARGET_TOTAL_WORDS_MIN = 300;
const TARGET_TOTAL_WORDS_MAX = 360;
const ESTIMATED_WORDS_PER_SECOND = 2.65;
const ESTIMATED_TURN_OVERHEAD_SECONDS = 0.25;

function countWords(text: string) {
	return String(text)
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
}

const CONTRACTION_REPAIRS = new Map<string, string>([
	['aint', "ain't"],
	['arent', "aren't"],
	['cant', "can't"],
	['couldnt', "couldn't"],
	['didnt', "didn't"],
	['doesnt', "doesn't"],
	['dont', "don't"],
	['hadnt', "hadn't"],
	['hasnt', "hasn't"],
	['havent', "haven't"],
	['heres', "here's"],
	['hes', "he's"],
	['hows', "how's"],
	['id', "I'd"],
	['ill', "I'll"],
	['im', "I'm"],
	['isnt', "isn't"],
	['ive', "I've"],
	['lets', "let's"],
	['shes', "she's"],
	['shouldnt', "shouldn't"],
	['thats', "that's"],
	['theyd', "they'd"],
	['theyll', "they'll"],
	['theyre', "they're"],
	['theyve', "they've"],
	['theres', "there's"],
	['wasnt', "wasn't"],
	['werent', "weren't"],
	['whats', "what's"],
	['wheres', "where's"],
	['whos', "who's"],
	['wont', "won't"],
	['wouldnt', "wouldn't"],
	['yall', "y'all"],
	['youd', "you'd"],
	['youll', "you'll"],
	['youre', "you're"],
	['youve', "you've"],
]);

function applyReplacementCase(originalToken: string, replacement: string) {
	if (originalToken === originalToken.toUpperCase() && originalToken !== 'ID') {
		return replacement.toUpperCase();
	}

	if (/^[A-Z]/.test(originalToken) && !replacement.startsWith("I'")) {
		return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
	}

	return replacement;
}

function repairCommonContractions(text: string) {
	return String(text).replace(/\b[A-Za-z]+\b/g, (token) => {
		if (token === 'ID') {
			return token;
		}

		const replacement = CONTRACTION_REPAIRS.get(token.toLowerCase());
		return replacement ? applyReplacementCase(token, replacement) : token;
	});
}

function sanitizePlaintextDialogueText(text: string) {
	return String(text ?? '')
		.replace(/\r?\n+/g, ' ')
		.replace(/```+/g, ' ')
		.replace(/[*_`~]+/g, '')
		.replace(/[<>{}\[\]]+/g, '')
		.replace(/^\s*[-•]+\s*/g, '')
		.replace(/^["']+|["']+$/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function ensureDialoguePunctuation(text: string) {
	const trimmed = String(text ?? '').trim();
	if (!trimmed) {
		return '';
	}

	const words = trimmed.split(/\s+/).filter(Boolean);
	const punctuationMatches = trimmed.match(/[,.!?;:…。！？，；：]/g) ?? [];
	const hasFinalSentencePunctuation = /[.!?。！？]$/.test(trimmed);
	const needsInternalPunctuation =
		words.length >= 12 &&
		(punctuationMatches.length === 0 ||
			(punctuationMatches.length === 1 && hasFinalSentencePunctuation));

	if (!needsInternalPunctuation) {
		return hasFinalSentencePunctuation ? trimmed : `${trimmed}.`;
	}

	const finalPunctuation = hasFinalSentencePunctuation ? trimmed.slice(-1) : '.';
	const cleanedWords = words.map((word) =>
		word.replace(/[,.!?;:…。！？，；：]+$/g, '')
	);
	const groupSize = Math.max(6, Math.min(9, Math.round(words.length / 3)));

	return cleanedWords
		.map((word, index) => {
			if (index === cleanedWords.length - 1) {
				return `${word}${finalPunctuation}`;
			}

			if ((index + 1) % groupSize === 0) {
				return `${word},`;
			}

			return word;
		})
		.join(' ');
}

function normalizeDialogueTextForSpeech(text: string) {
	return ensureDialoguePunctuation(
		repairCommonContractions(sanitizePlaintextDialogueText(text))
	);
}

function estimateTranscriptDurationSeconds(transcript: Transcript[]) {
	const totalWords = transcript.reduce(
		(sum, entry) => sum + countWords(entry.text),
		0
	);
	const estimatedDialogueSeconds = totalWords / ESTIMATED_WORDS_PER_SECOND;
	const estimatedGapSeconds =
		Math.max(0, transcript.length - 1) * ESTIMATED_TURN_OVERHEAD_SECONDS;

	return estimatedDialogueSeconds + estimatedGapSeconds;
}

function getTranscriptShapeTargets(agentCount: number) {
	const safeAgentCount = Math.max(agentCount, 1);

	if (safeAgentCount <= 4) {
		return {
			targetTurns: 12,
			minWordsPerTurn: 24,
			maxWordsPerTurn: 30,
			targetTotalWordsMin: TARGET_TOTAL_WORDS_MIN,
			targetTotalWordsMax: TARGET_TOTAL_WORDS_MAX,
		};
	}

	if (safeAgentCount === 5) {
		return {
			targetTurns: 15,
			minWordsPerTurn: 20,
			maxWordsPerTurn: 24,
			targetTotalWordsMin: TARGET_TOTAL_WORDS_MIN,
			targetTotalWordsMax: TARGET_TOTAL_WORDS_MAX,
		};
	}

	if (safeAgentCount === 6) {
		return {
			targetTurns: 18,
			minWordsPerTurn: 17,
			maxWordsPerTurn: 20,
			targetTotalWordsMin: TARGET_TOTAL_WORDS_MIN,
			targetTotalWordsMax: TARGET_TOTAL_WORDS_MAX,
		};
	}

	if (safeAgentCount === 7) {
		return {
			targetTurns: 14,
			minWordsPerTurn: 22,
			maxWordsPerTurn: 26,
			targetTotalWordsMin: TARGET_TOTAL_WORDS_MIN,
			targetTotalWordsMax: TARGET_TOTAL_WORDS_MAX,
		};
	}

	return {
		targetTurns: 16,
		minWordsPerTurn: 19,
		maxWordsPerTurn: 23,
		targetTotalWordsMin: TARGET_TOTAL_WORDS_MIN,
		targetTotalWordsMax: TARGET_TOTAL_WORDS_MAX,
	};
}

function buildSpeakerTurnPlan(agents: string[], targetTurns: number) {
	return Array.from({ length: targetTurns }, (_, index) => {
		return agents[index % agents.length];
	});
}

function getCastPacingInstruction(
	agents: string[],
	targets: ReturnType<typeof getTranscriptShapeTargets>
) {
	const speakerTurnPlan = buildSpeakerTurnPlan(agents, targets.targetTurns);

	return `Use exactly ${targets.targetTurns} transcript entries in this exact agentId order: ${speakerTurnPlan.join(
		', '
	)}. Each entry should be ${targets.minWordsPerTurn}-${targets.maxWordsPerTurn} spoken words, usually 2 punchy sentences. The full transcript should land around ${TARGET_DURATION_IDEAL_SECONDS} seconds by totaling ${targets.targetTotalWordsMin}-${targets.targetTotalWordsMax} spoken words. Do not give each speaker only one tiny line; every selected speaker should receive the repeated turns shown in the order above.`;
}

function normalizeAgentIdKey(agentId: string) {
	return String(agentId ?? '')
		.trim()
		.toUpperCase()
		.replace(/['’]/g, '')
		.replace(/&/g, ' AND ')
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function humanizeAgentName(agentId: string) {
	return agentId.replace(/_/g, ' ');
}

function buildAgentIdLookup(agents: string[]) {
	const lookup = new Map<string, string>();

	for (const agentId of agents) {
		const normalizedAgentId = normalizeAgentIdKey(agentId);
		const normalizedHumanName = normalizeAgentIdKey(humanizeAgentName(agentId));

		for (const key of [
			normalizedAgentId,
			normalizedHumanName,
			normalizedAgentId.replace(/_/g, ''),
			normalizedHumanName.replace(/_/g, ''),
		]) {
			if (key) {
				lookup.set(key, agentId);
			}
		}
	}

	return lookup;
}

function resolveAllowedAgentId(rawAgentId: string, agentIdLookup: Map<string, string>) {
	const trimmedAgentId = String(rawAgentId ?? '').trim();
	const normalizedAgentId = normalizeAgentIdKey(trimmedAgentId);

	return (
		agentIdLookup.get(normalizedAgentId) ??
		agentIdLookup.get(normalizedAgentId.replace(/_/g, '')) ??
		trimmedAgentId
	);
}

function normalizeTranscript(rawTranscript: Transcript[], agents: string[]) {
	const agentIdLookup = buildAgentIdLookup(agents);

	return rawTranscript.map((entry) => ({
		agentId: resolveAllowedAgentId(
			String(entry.agentId ?? '').trim(),
			agentIdLookup
		),
		text: normalizeDialogueTextForSpeech(String(entry.text ?? '')),
	}));
}

function validateTranscript(transcript: Transcript[], agents: string[]) {
	const validAgentIds = new Set(agents);
	const presentAgentIds = new Set<string>();
	const targets = getTranscriptShapeTargets(agents.length);
	const warnings: string[] = [];

	if (transcript.length === 0) {
		throw new Error('Transcript was empty');
	}

	if (transcript.length !== targets.targetTurns) {
		warnings.push(
			`Transcript used ${transcript.length} turns, expected ${targets.targetTurns} turns`
		);
	}

	for (const entry of transcript) {
		if (!validAgentIds.has(entry.agentId)) {
			throw new Error(`Unexpected agentId in transcript: ${entry.agentId}`);
		}

		if (!entry.text) {
			throw new Error(`Transcript line for ${entry.agentId} was empty`);
		}

		const wordCount = countWords(entry.text);
		if (
			wordCount < targets.minWordsPerTurn ||
			wordCount > targets.maxWordsPerTurn
		) {
			warnings.push(
				`Transcript line for ${entry.agentId} used ${wordCount} words, expected ${targets.minWordsPerTurn}-${targets.maxWordsPerTurn}`
			);
		}

		presentAgentIds.add(entry.agentId);
	}

	const missingAgents = agents.filter((agent) => !presentAgentIds.has(agent));
	if (missingAgents.length > 0) {
		throw new Error(
			`Transcript did not include every selected agent: ${missingAgents.join(', ')}`
		);
	}

	const estimatedDuration = estimateTranscriptDurationSeconds(transcript);
	const totalWords = transcript.reduce((sum, entry) => sum + countWords(entry.text), 0);
	if (
		totalWords < targets.targetTotalWordsMin ||
		totalWords > targets.targetTotalWordsMax
	) {
		warnings.push(
			`Transcript used ${totalWords} total words, expected ${targets.targetTotalWordsMin}-${targets.targetTotalWordsMax}`
		);
	}

	if (
		estimatedDuration < TARGET_DURATION_MIN_SECONDS ||
		estimatedDuration > TARGET_DURATION_MAX_SECONDS
	) {
		warnings.push(
			`Transcript estimated runtime ${estimatedDuration.toFixed(
				1
			)}s fell outside the ${TARGET_DURATION_MIN_SECONDS}-${TARGET_DURATION_MAX_SECONDS}s target`
		);
	}

	return {
		estimatedDuration,
		totalWords,
		warnings,
	};
}

async function generateBrainrotTranscript(
	topic: string,
	agents: string[]
) {
	console.log('📝 Starting generateTranscript with params:', {
		topic,
		agents,
	});

	const targets = getTranscriptShapeTargets(agents.length);
	const castPacingInstruction = getCastPacingInstruction(agents, targets);

	try {
		console.log('🤖 Creating Groq chat completion...');
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `Create a dialogue for a short-form conversation on the topic of ${topic}. The conversation should include these agents: ${agents
						.map((agent) => agent.split('_').join(' '))
						.join(', ')}. ${castPacingInstruction} They should act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. The dialogue should still provide insights into ${topic} but do so in the most profane and shocking way possible. The agentId attribute must be one of these exact uppercase IDs, including underscores exactly as shown: ${agents.join(
						', '
					)}. Never use display names like "Patrick Bateman" or "PATRICK BATEMAN" in agentId. The JSON format WHICH MUST BE ADHERED TO ALWAYS is as follows: { "transcript": [ { "agentId": "${
						agents[0]
					}", "text": "their line of conversation in the dialog" } ] }. Every text field must be plain spoken dialogue with normal punctuation. Use commas, periods, question marks, and exclamation marks where a human speaker would pause or emphasize a phrase, because punctuation controls TTS pronunciation and sprite emotion timing. Preserve apostrophes in contractions like I'd, I'm, don't, you're, and y'all; never write Id when you mean I'd. Never include markdown, bullet points, emphasis markers, stage directions, action cues, quoted wrappers, emojis, speaker labels inside the text, or any meta commentary. Do not use markdown/control symbols *, **, _, ~, \`, [, ], {, }, <, > in dialogue text, but normal punctuation and apostrophes are required.`,
				},
				{
					role: 'user',
					content: `Generate the full transcript about ${topic}. Target roughly ${TARGET_DURATION_IDEAL_SECONDS} seconds. Use exactly ${targets.targetTurns} transcript entries and ${targets.targetTotalWordsMin}-${targets.targetTotalWordsMax} total words. Follow the requested speaker order exactly.`,
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
			const rawTranscript = parsedContent?.transcript || null;

			if (rawTranscript !== null && Array.isArray(rawTranscript)) {
				transcript = normalizeTranscript(rawTranscript, agents);
				const validation = validateTranscript(transcript, agents);

				console.log('✅ Valid transcript generated');
				console.log(
					`⏱️ Estimated runtime: ${validation.estimatedDuration.toFixed(
						1
					)}s across ${validation.totalWords} words`
				);
				if (validation.warnings.length > 0) {
					console.warn(
						`⚠️ Continuing despite target diagnostics: ${validation.warnings.join(
							'; '
						)}`
					);
				}
				console.log('📜 Transcript lines:');
				transcript.forEach((entry, index) => {
					console.log(`${index + 1}. ${entry.agentId}: "${entry.text}"`);
				});
				return transcript;
			}

			console.log('⚠️ Invalid or empty transcript received');
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
		const transcript = (await brainrotTranscript(
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
				person,
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
export const subtitleDialogueEmotions = [];
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

export const rapper: string = 'SPONGEBOB';
export const imageBackground: string = '/rap/SPONGEBOB.png';
`;

		await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');

		return { audios, transcript };
	} catch (error) {
		console.error('❌ Error in generateTranscriptAudio:', error);
		throw error;
	}
}
