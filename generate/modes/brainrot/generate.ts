import getAudioDuration from '../../audioDuration';
import concatenateAudioFiles from '../../concat';
import { generateCleanSrt } from '../../cleanSrt';
import { query } from '../../dbClient';
import { secondsToSrtTime, srtTimeToSeconds } from '../../transcribeAudio';
import { transcribeAudio } from '../../transcribeAudio';
import { generateBrainrotTranscriptAudio } from './transcript';

export default async function generateBrainrot({
	local,
	topic,
	agentA,
	agentB,
	music,
	videoId,
}: {
	local: boolean;
	topic: string;
	agentA: string;
	agentB: string;
	music: string;
	videoId?: string;
}) {
	const { audios, transcript } = await generateBrainrotTranscriptAudio({
		local,
		topic,
		agentA,
		agentB,
		music,
		videoId,
	});
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
	const transcriptionResults = await transcribeAudio(
		audios.map((audio) => audio.audio)
	);

	const uncleanSrtContentArr = [];

	// Iterate over each transcription result and corresponding audio file
	for (let i = 0; i < (transcriptionResults ?? []).length; i++) {
		const transcription = transcriptionResults![i][0];
		const audio = audios[i]; // Corresponding audio file object
		let srtIndex = 1; // SRT index starts at 1

		// Initialize SRT content
		let srtContent = '';

		const words = transcription.segments.flatMap(
			(segment: any) => segment.words
		);
		for (let j = 0; j < words.length; j++) {
			const word = words[j];
			const nextWord = words[j + 1];

			// Set the start time to the word's start time
			const startTime = secondsToSrtTime(word.start);

			// If there's a next word, the end time is the next word's start time
			// Otherwise, use the current word's end time
			const endTime = nextWord
				? secondsToSrtTime(nextWord.start)
				: secondsToSrtTime(word.end);

			// Append the formatted SRT entry to the content
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

		// The name of the SRT file is based on the second element of the audio array but with the .srt extension
		const srtFileName = audio.audio
			.replace('voice', 'srt')
			.replace('.mp3', '.srt');

		uncleanSrtContentArr.push({
			content: incrementedSrtContent,
			fileName: srtFileName,
		});

		const duration = await getAudioDuration(audio.audio);
		startingTime += duration + 0.2;
	}
	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Cleaning subtitle srt files', progress = 35 WHERE video_id = ?",
			[videoId]
		);
	}

	await generateCleanSrt(
		transcript.map((t) => t.text),
		uncleanSrtContentArr
	);
}
