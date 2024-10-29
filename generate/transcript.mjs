import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk/index.mjs';

console.log('🔄 Initializing transcript.mjs module');

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

async function generateTranscript(topic, agentA, agentB, duration) {
	console.log('📝 Starting generateTranscript with params:', {
		topic,
		agentA,
		agentB,
		duration,
	});

	try {
		console.log('🤖 Creating Groq chat completion...');
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `Create a dialogue for a short-form conversation on the topic of ${topic}...`,
				},
				{
					role: 'user',
					content: `generate a video about ${topic}...`,
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
		console.log('📄 Content length:', content.length);

		return content;
	} catch (error) {
		console.error('❌ Error in generateTranscript:', error);
		throw error;
	}
}

function delay(ms) {
	console.log(`⏳ Delaying for ${ms}ms`);
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function transcriptFunction(
	topic,
	agentA,
	agentB,
	duration
) {
	console.log('🎬 Starting transcriptFunction with params:', {
		topic,
		agentA,
		agentB,
		duration,
	});

	let transcript = null;
	let attempts = 0;

	while (attempts < 5) {
		console.log(`🔄 Attempt ${attempts + 1}/5`);
		try {
			console.log('📝 Generating transcript...');
			const content = await generateTranscript(topic, agentA, agentB, duration);

			console.log('🔍 Parsing content...');
			transcript = content === '' ? null : JSON.parse(content);

			if (transcript !== null) {
				console.log('✅ Valid transcript generated');
				return transcript;
			} else {
				console.log('⚠️ Empty transcript received');
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
