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

function adjustPath(filePath: string): string {
	if (filePath.startsWith('/app/shared_data/')) {
		return filePath.replace('/app/shared_data/', '/app/brainrot/shared_data/');
	} else if (filePath.startsWith('shared_data/')) {
		return `/app/brainrot/${filePath}`;
	}
	return filePath;
}

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
	// Update status: Starting audio separation
	if (!local && videoId) {
		await query(
			"UPDATE `pending-videos` SET status = 'Separating audio tracks', progress = 10 WHERE video_id = ?",
			[videoId]
		);
	}

	const { instrumentalPath, vocalPath } = await fetch(
		`${RVC_SERVICE_URL}/audio-separator`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ url: audioUrl }),
		}
	).then((res) => res.json());

	const adjustedInstrumentalPath = adjustPath(instrumentalPath);
	const adjustedVocalPath = adjustPath(vocalPath);

	console.log(`Original instrumental path: ${instrumentalPath}`);
	console.log(`Adjusted instrumental path: ${adjustedInstrumentalPath}`);
	console.log(`Original vocal path: ${vocalPath}`);
	console.log(`Adjusted vocal path: ${adjustedVocalPath}`);

	// Update status: Starting voice conversion
	if (!local && videoId) {
		await query(
			"UPDATE `pending-videos` SET status = 'Converting vocals with RVC', progress = 60 WHERE video_id = ?",
			[videoId]
		);
	}

	const { finalAudioPath } = await fetch(`${RVC_SERVICE_URL}/rvc`, {
		method: 'POST',
		body: JSON.stringify({
			instrumentalPath,
			vocalPath,
			rapper,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
	}).then((res) => res.json());

	// Adjust the final audio path for the brainrot container
	const adjustedFinalAudioPath = adjustPath(finalAudioPath);
	console.log(`Original final audio path: ${finalAudioPath}`);
	console.log(`Adjusted final audio path: ${adjustedFinalAudioPath}`);

	// Ensure the finalAudioPath is correctly resolved
	const resolvedFinalAudioPath = adjustedFinalAudioPath.startsWith('/')
		? adjustedFinalAudioPath
		: path.join(process.cwd(), adjustedFinalAudioPath);

	// Update status: Combining audio tracks
	if (!local && videoId) {
		await query(
			"UPDATE `pending-videos` SET status = 'Combining audio tracks', progress = 70 WHERE video_id = ?",
			[videoId]
		);
	}

	// combine the instrumental and final vocal files into a single file audio.mp3
	const combinedAudioPath = path.join('public', 'audio.mp3');

	if (!fs.existsSync('tmp/')) {
		fs.mkdirSync('tmp/');
	}

	// Verify files exist before combining
	console.log(
		`Checking if instrumental file exists: ${adjustedInstrumentalPath}`
	);
	console.log(
		`Instrumental file exists: ${fs.existsSync(adjustedInstrumentalPath)}`
	);
	console.log(`Checking if vocal file exists: ${resolvedFinalAudioPath}`);
	console.log(`Vocal file exists: ${fs.existsSync(resolvedFinalAudioPath)}`);

	// Combine instrumental and vocals using ffmpeg
	await new Promise<void>((resolve, reject) => {
		const command = ffmpeg();

		command.input(adjustedInstrumentalPath);
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

	// Update status: Audio processing completed
	if (!local && videoId) {
		await query(
			"UPDATE `pending-videos` SET status = 'Audio processing completed', progress = 90 WHERE video_id = ?",
			[videoId]
		);
	}
}
