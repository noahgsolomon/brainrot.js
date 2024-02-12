import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export default async function transcriptFunction(topic, agentA, agentB) {
	const completion = await openai.chat.completions.create({
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
				)} offers a deep, analytical perspective. The dialogue should be engaging and include light humor, yet still provide meaningful insights into ${topic}. Limit the dialogue to a maximum of 7 exchanges, aiming for a concise transcript that would last between 45-50 seconds. The person attribute should either be ${agentA} or ${agentB}. The line attribute should be a that character's line of dialogue. I also need an asset description under the asset attribute which would be a relevant search query to find an image which should be relevant to the overall topic of the conversation. The asset descriptions shouldn't be vague, but a description of something that you think would be a good image to go along with the conversation. Specificity is key.`,
			},
		],
		functions: [
			{
				name: 'transcript',
				description: `Transcript between two people about a topic.`,
				parameters: {
					type: 'object',
					properties: {
						transcript: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									person: { type: 'string' },
									line: { type: 'string' },
									asset: { type: 'string' },
								},
								required: ['person', 'line', 'asset'],
							},
						},
					},
					required: ['line'],
				},
			},
		],
		function_call: { name: 'transcript' },
		model: 'gpt-4-1106-preview',
	});

	const responseBody = await JSON.parse(
		completion.choices[0]?.message.function_call.arguments
	);

	return responseBody;
}
