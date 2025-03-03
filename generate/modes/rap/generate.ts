import getAudioDuration from '../../audioDuration';
import { generateCleanSrt } from '../../cleanSrt';
import { query } from '../../dbClient';
import { secondsToSrtTime, srtTimeToSeconds } from '../../transcribeAudio';
import { transcribeAudio } from '../../transcribeAudio';
import { generateFillerContext } from '../../fillerContext';
import { writeFile } from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

const RVC_SERVICE_URL = process.env.RVC_SERVICE_URL || 'http://127.0.0.1:5555';

export default async function generateRap({
	local,
	rapper,
	lyrics,
	audioUrl,
	videoId,
	outputType,
}: {
	local: boolean;
	rapper: Rapper;
	lyrics?: string;
	audioUrl: string;
	videoId?: string;
	outputType: 'audio' | 'video';
}) {
	const { instrumentalPath, vocalPath } = await fetch(
		'http://127.0.0.1:5555/audio-separator',
		{
			method: 'POST',
			body: JSON.stringify({ url: audioUrl }),
		}
	).then((res) => res.json());

	const { finalAudioPath } = await fetch(`${RVC_SERVICE_URL}/rvc`, {
		method: 'POST',
		body: JSON.stringify({ instrumentalPath, vocalPath, rapper }),
		headers: {
			'Content-Type': 'application/json',
		},
	}).then((res) => res.json());

	// Ensure the finalAudioPath is correctly resolved
	const resolvedFinalAudioPath = finalAudioPath.startsWith('/')
		? finalAudioPath
		: path.join(process.cwd(), finalAudioPath);

	let startingTime = 0;

	// combine the instrumental and final vocal files into a single file audio.mp3
	const combinedAudioPath = path.join('public', 'audio.mp3');

	if (!fs.existsSync('tmp/')) {
		fs.mkdirSync('tmp/');
	}

	// Combine instrumental and vocals using ffmpeg
	await new Promise<void>((resolve, reject) => {
		const command = ffmpeg();

		command.input(instrumentalPath);
		command.input(resolvedFinalAudioPath);

		command
			.outputOptions([
				'-filter_complex',
				'[0:a][1:a]amix=inputs=2:duration=longest',
			])
			.on('start', (commandLine) => {
				console.log('Spawned Ffmpeg with command:', commandLine);
			})
			.on('error', (err) => {
				console.error('Error combining audio files:', err.message);
				reject(err);
			})
			.on('end', () => {
				console.log('Finished combining audio files!');
				resolve();
			})
			.save(combinedAudioPath);
	});

	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Transcribing audio.mp3', progress = 20 WHERE video_id = ?",
			[videoId]
		);
	}

	if (outputType === 'video') {
		const transcriptionResults = await transcribeAudio([vocalPath]);

		const uncleanSrtContentArr = [];

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
}
