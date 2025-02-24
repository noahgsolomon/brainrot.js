import getAudioDuration from '../../audioDuration';
import concatenateAudioFiles from '../../concat';
import { generateCleanSrt } from '../../cleanSrt';
import { query } from '../../dbClient';
import { secondsToSrtTime, srtTimeToSeconds } from '../../transcribeAudio';
import { transcribeAudio } from '../../transcribeAudio';
import { generateFillerContext } from '../../fillerContext';
import { writeFile } from 'fs/promises';

export default async function generateRap({
	local,
	topic,
	rapper,
	lyrics,
	audioUrl,
	videoId,
}: {
	local: boolean;
	topic: string;
	rapper: Rapper;
	lyrics?: string;
	audioUrl: string;
	videoId?: string;
}) {
	// fetch request to audio separator with the audio url, which returns a path to an instrumental file and a path to a vocal file
	const { instrumentalPath, vocalPath } = await fetch(
		'http://127.0.0.1:5555/audio-separator',
		{
			method: 'POST',
			body: JSON.stringify({ url: audioUrl }),
		}
	).then((res) => res.json());

	const { finalAudioPath } = await fetch('http://127.0.0.1:5555/rvc', {
		method: 'POST',
		body: JSON.stringify({ instrumentalPath, vocalPath, rapper }),
	}).then((res) => res.json());

	let startingTime = 0;

	// Concatenate audio files if needed, or comment out if not used
	concatenateAudioFiles();

	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Transcribing audio.mp3', progress = 20 WHERE video_id = ?",
			[videoId]
		);
	}

	// Perform transcription and get the result
	const transcriptionResults = await transcribeAudio([vocalPath]);

	const uncleanSrtContentArr = [];

	// Iterate over each transcription result and corresponding audio file
	for (let i = 0; i < (transcriptionResults ?? []).length; i++) {
		const transcription = transcriptionResults![i][0];
		let srtIndex = 1;

		let srtContent = '';

		const words = transcription.segments.flatMap(
			(segment: any) => segment.words
		);
		for (let j = 0; j < words.length; j++) {
			const word = words[j];
			const nextWord = words[j + 1];

			const startTime = secondsToSrtTime(word.start);

			const endTime = nextWord
				? secondsToSrtTime(nextWord.start)
				: secondsToSrtTime(word.end);

			srtContent += `${srtIndex}\n${startTime} --> ${endTime}\n${word.text}\n\n`;
			srtIndex++;
		}

		const lines = srtContent.split('\n');

		const incrementedSrtLines = lines.map((line) => {
			const timeMatch = line.match(
				/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
			);
			if (timeMatch) {
				const startTime = srtTimeToSeconds(timeMatch[1]) + startingTime;
				const endTime = srtTimeToSeconds(timeMatch[2]) + startingTime;
				const incrementedStartTime = secondsToSrtTime(startTime);
				const incrementedEndTime = secondsToSrtTime(endTime);
				return `${incrementedStartTime} --> ${incrementedEndTime}`;
			}
			return line;
		});

		const incrementedSrtContent = incrementedSrtLines.join('\n');

		const srtFileName = finalAudioPath
			.replace('voice', 'srt')
			.replace('.mp3', '.srt');

		uncleanSrtContentArr.push({
			content: incrementedSrtContent,
			fileName: srtFileName,
		});

		const duration = await getAudioDuration(finalAudioPath);
		startingTime += duration + 0.2;
	}
	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Cleaning subtitle srt files', progress = 35 WHERE video_id = ?",
			[videoId]
		);
	}

	if (lyrics) {
		await generateCleanSrt([lyrics], uncleanSrtContentArr);
	}

	let contextContent = `
import { staticFile } from 'remotion';

export const rapper: string = '${rapper}';
export const videoMode = 'rap';
export const imageBackground: string = '/rap/${rapper}.png'
`;

	contextContent += generateFillerContext('rap');

	await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');
}
