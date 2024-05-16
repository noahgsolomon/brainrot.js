import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk/index.mjs';

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
});

export async function generateCleanSrt(transcript, srt) {
	const promises = [];
	for (let i = 0; i < transcript.length; i++) {
		promises.push(cleanSrt(transcript[i].line, srt[i].content, i));
	}
	const responses = await Promise.all(promises);

	for (let i = 0; i < srt.length; i++) {
		const response = responses.find((response) => response.i === i);
		if (response) {
			await writeFile(srt[i].fileName, response.content, 'utf8');
		}
	}
}

async function cleanSrt(transcript, srt, i) {
	const completion = await groq.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `The first item I will give you is the correct text, and the next will be the SRT generated from this text which is not totally accurate. Sometimes the srt files just doesn't have words so if this is the case add the missing words to the SRT file which are present in the transcript. Based on the accurate transcript, and the possibly inaccurate SRT file, return the SRT text corrected for inaccurate spelling and such. Make sure you keep the format and the times the same.
                            
                            transcript: 
                            ${transcript}
                            
                            srt file text: 
                            ${srt}`,
			},
		],
		model: 'llama3-8b-8192',
		temperature: 0.5,
		max_tokens: 4096,
		top_p: 1,
		stop: null,
		stream: false,
	});

	const content = completion.choices[0]?.message?.content || '';
	return { content, i };
}
