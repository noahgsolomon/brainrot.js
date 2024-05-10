import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk/index.mjs';

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

async function generateTranscript(topic, agentA, agentB, duration) {
	const completion = await groq.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `Create a dialogue for a short-form conversation on the topic of ${topic}. The conversation should be between two agents, ${agentA.replace(
					'_',
					' '
				)} and ${agentB}, each with their unique mannerisms and speech patterns. ${agentA.replace(
					'_',
					' '
				)} should engage with the topic with a sense of curiosity and a desire for practical understanding, while ${agentB.replace(
					'_',
					' '
				)} offers a deep, analytical perspective. The dialogue should be engaging and include light humor, yet still provide meaningful insights into ${topic}. Limit the dialogue to a maximum of ${
					duration * 7
				} exchanges, aiming for a concise transcript that would last between ${duration} minutes. The person attribute should either be ${agentA} or ${agentB}. The line attribute should be that character's line of dialogue. I also need an asset description under the asset attribute which would be a relevant search query to find an image which should be relevant to the overall topic of the conversation. The asset descriptions shouldn't be vague, but a description of something that you think would be a good image to go along with the conversation. Specificity is key. The JSON format WHICH MUST BE ADHERED TO ALWAYS is as follows: { transcript: { [ {'person': 'the exact value of ${agentA} or ${agentB} depending on who is talking', 'line': 'their line of conversation in the dialog', asset: 'relevant search query based on the current line'} ] } }`,
			},
			{
				role: 'user',
				content: `generate a video about ${topic}. Both the agents should talk about it in a way they would, but extremify their qualities and make the conversation risque if either agents are controversial.`,
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

	const content = completion.choices[0]?.message?.content || '';

	return content;
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function transcriptFunction(
	topic,
	agentA,
	agentB,
	duration
) {
	let transcript = null;
	let attempts = 0;

	while (attempts < 5) {
		try {
			const content = await generateTranscript(topic, agentA, agentB, duration);
			transcript = content === '' ? null : JSON.parse(content);
			if (transcript !== null) {
				return transcript;
			}
		} catch (error) {
			console.error('Attempt failed:', error);
			await delay(15000);
		}
		attempts++;
	}

	throw new Error(
		`Failed to generate valid transcript after 5 attempts for topic: ${topic}`
	);
}
