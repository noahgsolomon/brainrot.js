import { generateTranscriptAudio } from './eleven.mjs';
import getAudioDuration from './audioduration.mjs';
import { writeFile } from 'fs/promises';
import concatenateAudioFiles from './concat.mjs';
import { generateCleanSrt } from './cleanSrt.mjs';
import { query } from './dbClient.mjs';

const transcribeAudio = async (audios) => {
	const retryDelays = [1000, 2000, 3000]; // Retry delays in milliseconds
	let retryCount = 0;

	while (retryCount < retryDelays.length) {
		try {
			const response = await fetch('http://127.0.0.1:5000/transcribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ audios }),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Process each segment to ensure it has words
			return data.map(([transcription, audioPath]) => {
				const processedTranscription = {
					...transcription,
					segments: transcription.segments.map((segment) => ({
						...segment,
						words:
							segment.words ||
							segment.text.split(' ').map((word, index) => ({
								text: word,
								start:
									segment.start +
									index *
										((segment.end - segment.start) /
											segment.text.split(' ').length),
								end:
									segment.start +
									(index + 1) *
										((segment.end - segment.start) /
											segment.text.split(' ').length),
							})),
					})),
				};

				return [processedTranscription, audioPath];
			});
		} catch (error) {
			console.error(
				`Error transcribing audio (attempt ${retryCount + 1}):`,
				error
			);

			if (retryCount < retryDelays.length - 1) {
				const delay = retryDelays[retryCount];
				console.log(`Retrying in ${delay / 1000} second(s)...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			} else {
				throw error;
			}

			retryCount++;
		}
	}
};

function srtTimeToSeconds(srtTime) {
	const [hours, minutes, secondsAndMillis] = srtTime.split(':');
	const [seconds, milliseconds] = secondsAndMillis.split(',');
	return (
		Number(hours) * 3600 +
		Number(minutes) * 60 +
		Number(seconds) +
		Number(milliseconds) / 1000
	);
}

function secondsToSrtTime(seconds) {
	const pad = (num, size) => String(num).padStart(size, '0');
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const millis = Math.round((seconds % 1) * 1000);
	return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

export default async function transcribeFunction(
	local,
	topic,
	agentA,
	agentB,
	aiGeneratedImages,
	fps,
	duration,
	background,
	music,
	cleanSrt,
	videoId
) {
	const { audios, transcript } = await generateTranscriptAudio(
		local,
		topic,
		agentA,
		agentB,
		aiGeneratedImages,
		fps,
		duration,
		background,
		music,
		videoId
	);
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
	for (let i = 0; i < transcriptionResults.length; i++) {
		const transcription = transcriptionResults[i][0];
		const audio = audios[i]; // Corresponding audio file object
		let srtIndex = 1; // SRT index starts at 1

		// Initialize SRT content
		let srtContent = '';

		const words = transcription.segments.flatMap((segment) => segment.words);
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
	if (cleanSrt) {
		if (!local) {
			await query(
				"UPDATE `pending-videos` SET status = 'Cleaning subtitle srt files', progress = 35 WHERE video_id = ?",
				[videoId]
			);
		}

		await generateCleanSrt(transcript, uncleanSrtContentArr);
	} else {
		for (const uncleanSrtContent of uncleanSrtContentArr) {
			await writeFile(
				uncleanSrtContent.fileName,
				uncleanSrtContent.content,
				'utf8'
			);
		}
	}
}
