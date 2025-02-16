import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk';

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

async function generateTranscript(
	topic: string,
	agentA: string,
	agentB: string
) {
	console.log('📝 Starting generateTranscript with params:', {
		topic,
		agentA,
		agentB,
	});

	try {
		console.log('🤖 Creating Groq chat completion...');
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `Create a dialogue for a short-form conversation on the topic of ${topic}. The conversation should be between two agents, ${agentA.replace(
						'_',
						' '
					)} and ${agentB}, who should act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. ${agentA.replace(
						'_',
						' '
					)} and ${agentB.replace(
						'_',
						' '
					)} should both be absurdly vulgar and crude in their language, cursing excessively and making outrageous statements to the point where it becomes almost comically over-the-top. The dialogue should still provide insights into ${topic} but do so in the most profane and shocking way possible. Limit the dialogue to a maximum of ${7} exchanges, aiming for a concise transcript that would last for 1 minute. The agentId attribute should either be ${agentA} or ${agentB}. The text attribute should be that character's line of dialogue. Make it as edgy and controversial as possible while still being funny. I also need an asset description under the asset attribute which would be a relevant search query to find an image which should be relevant to the overall topic of the conversation. The asset descriptions shouldn't be vague, but a description of something that you think would be a good image to go along with the conversation. Specificity is key. Remember, ${agentA} and ${agentB} are both ${agentA.replace(
						'_',
						' '
					)} and ${agentB.replace(
						'_',
						' '
					)} behaving like they would in real life, but more inflammatory. and don't include a direct mention of a politician in assets, if for example, Trump is mentioned, don't use the word Trump in the asset description, but instead something like white male with blonde hair combover ya know. The JSON format WHICH MUST BE ADHERED TO ALWAYS is as follows: { transcript: { [ {'agentId': 'the exact value of ${agentA} or ${agentB} depending on who is talking', 'text': 'their line of conversation in the dialog', 'asset': 'relevant search query based on the current line'} ] } }`,
				},
				{
					role: 'user',
					content: `generate a video about ${topic}. Both the agents should talk about it in a way they would, but extremify their qualities and make the conversation risque so that it would be interesting to watch and edgy.`,
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

export default async function transcript(
	topic: string,
	agentA: string,
	agentB: string
) {
	console.log('🎬 Starting transcriptFunction with params:', {
		topic,
		agentA,
		agentB,
	});

	let transcript: Transcript[] | null = null;
	let attempts = 0;

	while (attempts < 5) {
		console.log(`🔄 Attempt ${attempts + 1}/5`);
		try {
			console.log('📝 Generating transcript...');
			const content = await generateTranscript(topic, agentA, agentB);

			console.log('🔍 Parsing content...');
			const parsedContent = content === '' ? null : JSON.parse(content);
			// Extract the transcript array from the response
			transcript = parsedContent?.transcript || null;

			if (transcript !== null && Array.isArray(transcript)) {
				console.log('✅ Valid transcript generated');
				console.log('📜 Transcript lines:');
				transcript.forEach((entry, index) => {
					console.log(`${index + 1}. ${entry.agentId}: "${entry.text}"`);
					console.log(`   🖼️ Asset: ${entry.asset}`);
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
