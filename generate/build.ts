import generateBrainrot from './modes/brainrot/generate';
import generateRap from './modes/rap/generate';
import { rm, mkdir, unlink } from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { query } from './dbClient';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RowDataPacket } from 'mysql2';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type VideoMode = 'brainrot' | 'podcast' | 'monologue' | 'rap';

// NOTE: There's a type mismatch between the Rapper type in index.d.ts and what's used in generateRap.
// For now, we're using type assertions to bypass the linter errors.
// TODO: Align the Rapper type definitions across the codebase.

const execP = promisify(exec);

dotenv.config();

// Ensure AWS credentials are properly loaded and logged
console.log('AWS Region:', process.env.AWS_REGION || 'us-east-1');
console.log('AWS Access Key ID available:', !!process.env.AWS_ACCESS_KEY_ID);
console.log(
	'AWS Secret Access Key available:',
	!!process.env.AWS_SECRET_ACCESS_KEY
);

const s3Client = new S3Client({
	region: process.env.AWS_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
	},
});

const AUDIO_BUCKET_NAME = 'brainrot-audio';

async function uploadToS3(filePath: string, key: string): Promise<string> {
	console.log(`🚀 Uploading file to S3: ${filePath} -> ${key}`);

	try {
		// Check if file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		const fileContent = fs.readFileSync(filePath);

		// For S3 keys, we need to encode special characters but keep the path structure
		// We'll encode each path segment separately
		const encodedKey = key
			.split('/')
			.map((part) => {
				// Replace any existing URL-encoded sequences with their actual characters first
				// to avoid double-encoding
				const decodedPart = part.replace(/%([0-9A-F]{2})/g, (_, hex) =>
					String.fromCharCode(parseInt(hex, 16))
				);
				// Then encode properly for S3
				return encodeURIComponent(decodedPart);
			})
			.join('/');

		console.log(
			`📦 Using S3 bucket: ${AUDIO_BUCKET_NAME}, encoded key: ${encodedKey}`
		);
		const params = {
			Bucket: AUDIO_BUCKET_NAME,
			Key: encodedKey,
			Body: fileContent,
			ContentType: 'audio/mpeg',
		};

		// Verify all required parameters are present
		if (!params.Bucket || !params.Key || !params.Body) {
			throw new Error(
				`Missing required S3 parameters: Bucket=${!!params.Bucket}, Key=${!!params.Key}, Body=${!!params.Body}`
			);
		}

		await s3Client.send(new PutObjectCommand(params));

		const s3Url = `https://${AUDIO_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${encodedKey}`;
		console.log(`✅ File uploaded successfully to S3: ${s3Url}`);
		return s3Url;
	} catch (error) {
		console.error('❌ Error uploading file to S3:', error);
		if (error instanceof Error) {
			console.error(`Error name: ${error.name}, message: ${error.message}`);
			console.error(`Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function cleanupResources() {
	try {
		await rm(path.join('public', 'srt'), { recursive: true, force: true });
		await rm(path.join('public', 'voice'), { recursive: true, force: true });

		// Check if files exist before attempting to delete them
		const audioPath = path.join('public', `audio.mp3`);
		const contextPath = path.join('src', 'tmp', 'context.tsx');

		if (await fileExists(audioPath)) {
			await unlink(audioPath);
		} else {
			console.log(`File not found: ${audioPath} - skipping deletion`);
		}

		if (await fileExists(contextPath)) {
			await unlink(contextPath);
		} else {
			console.log(`File not found: ${contextPath} - skipping deletion`);
		}

		await mkdir(path.join('public', 'srt'), { recursive: true });
		await mkdir(path.join('public', 'voice'), { recursive: true });
	} catch (err) {
		console.error(`Error during cleanup: ${err}`);
	}
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

const local = false;

async function mainFn(
	topic: string,
	agentA: string,
	agentB: string,
	videoId: string,
	userId: string,
	music: string,
	credits: number,
	videoMode: VideoMode,
	audioUrl?: string,
	lyrics?: string,
	outputType?: 'audio' | 'video',
	songName?: string,
	artistName?: string,
	rapper?: string
) {
	console.log('🚀 Starting mainFn with:', {
		topic,
		agentA,
		agentB,
		videoId,
		userId,
		videoMode,
		...(videoMode === 'rap' && {
			audioUrl,
			outputType,
			songName,
			artistName,
			rapper,
		}),
	});
	try {
		console.log('📝 Updating process_id in pending-videos...');
		await query(
			'UPDATE `pending-videos` SET process_id = ? WHERE video_id = ?',
			[0, videoId]
		);
		console.log('✅ Process ID updated successfully');

		console.log(`🎙️ Starting ${videoMode} generation function...`);

		// Handle different video modes
		switch (videoMode) {
			case 'brainrot':
			case 'podcast':
			case 'monologue':
				await generateBrainrot({
					local,
					topic,
					agentA,
					agentB,
					music,
					videoId,
				});
				break;
			case 'rap':
				if (!audioUrl || !rapper || !outputType) {
					throw new Error('Missing required parameters for rap mode');
				}
				await generateRap({
					local,
					rapper: rapper as Rapper,
					lyrics,
					audioUrl,
					videoId,
					outputType,
				});
				break;
			default:
				throw new Error(`Unsupported video mode: ${videoMode}`);
		}

		console.log('✅ Generation completed successfully');

		if (videoMode === 'rap' && outputType === 'audio') {
			console.log('🎵 Processing rap audio output...');

			if (!fs.existsSync('out')) {
				fs.mkdirSync('out');
			}

			// Replace spaces with underscores in the filename to avoid encoding issues
			const sanitizedRapper = rapper?.replace(/\s+/g, '_') || '';
			const sanitizedSongName = songName?.replace(/\s+/g, '_') || '';
			const sanitizedArtistName = artistName?.replace(/\s+/g, '_') || '';

			const outputFileName = `${sanitizedRapper}_${sanitizedSongName}_${sanitizedArtistName}.mp3`;
			const outputPath = path.join('out', outputFileName);

			fs.copyFileSync(path.join('public', 'audio.mp3'), outputPath);
			console.log(`✅ Audio file saved to ${outputPath}`);

			console.log('📤 Uploading audio file to S3...');
			const s3Key = `rap-audio/${videoId}/${outputFileName}`;
			const s3Url = await uploadToS3(outputPath, s3Key);
			console.log(`✅ Audio file uploaded to S3: ${s3Url}`);

			await query(
				"UPDATE `pending-videos` SET status = 'COMPLETED', progress = 100, url = ? WHERE video_id = ?",
				[s3Url, videoId]
			);

			await query(
				`INSERT INTO rap_audio (user_id, rapper, song_name, artist_name, url, video_id) VALUES (?, ?, ?, ?, ?, ?)`,
				[userId, rapper, songName || '', artistName || '', s3Url, videoId]
			);

			console.log('✅ Rap audio processing completed successfully');
			return;
		}

		console.log('📊 Updating status to Deploying assets...');
		await query(
			"UPDATE `pending-videos` SET status = 'Deploying assets to S3 for render', progress = 50 WHERE video_id = ?",
			[videoId]
		);
		console.log('✅ Status updated to Deploying assets');

		console.log('🏗️ Building project with npm...');
		const { stdout, stderr } = await execP(
			'npx remotion lambda sites create src/index.ts --site-name=brainrot'
		);
		console.log('📤 Build stdout:', stdout);
		if (stderr) console.error('⚠️ Build stderr:', stderr);

		console.log('🔍 Searching for serve URL in output...');
		const regexServeUrl =
			/https:\/\/[\w-]+\.s3\.us-east-1\.amazonaws\.com\/sites\/[\w-]+\/index\.html/;
		const matchServeUrl = stdout.match(regexServeUrl);
		console.log('🌐 Serve URL found:', matchServeUrl);

		console.log('📊 Updating status to Rendering video...');
		await query(
			"UPDATE `pending-videos` SET status = 'Rendering video on lambda functions', progress = 75 WHERE video_id = ?",
			[videoId]
		);
		console.log('✅ Status updated to Rendering video');

		console.log('🎬 Starting video render...');
		const { stdout: stdoutRender, stderr: stderrRender } = await execP(
			'npx remotion lambda render https://remotionlambda-useast1-oaz2rkh49x.s3.us-east-1.amazonaws.com/sites/brainrot/index.html Video'
		);
		console.log('📤 Render stdout:', stdoutRender);
		if (stderrRender) console.error('⚠️ Render stderr:', stderrRender);

		console.log('🔍 Searching for S3 URL in render output...');
		const regex =
			/https:\/\/s3\.us-east-1\.amazonaws\.com\/[\w-]+\/renders\/[\w-]+\/out\.mp4/;
		const match = stdoutRender.match(regex);

		let s3Url = '';
		if (match) {
			s3Url = match[0];
			console.log('🎥 S3 URL found:', s3Url);
		} else {
			console.error('❌ No S3 URL found in output');
			throw new Error('No S3 URL found in the output');
		}

		console.log('🧹 Cleaning up resources...');
		await cleanupResources();
		console.log('✅ Resources cleaned up');

		console.log('💾 Inserting video record into database...');
		await query(
			`INSERT INTO videos (user_id, agent1, agent2, title, url, video_id) VALUES (?, ?, ?, ?, ?, ?)`,
			[userId, agentA, agentB, topic, s3Url, videoId]
		);
		console.log('✅ Video record inserted');

		console.log('📊 Updating final status to COMPLETED...');
		await query(
			"UPDATE `pending-videos` SET status = 'COMPLETED', progress = 100 WHERE video_id = ?",
			[videoId]
		);
		console.log('✅ Process completed successfully');
	} catch (error) {
		console.error('❌ Error in mainFn:', error);
		console.log('🧹 Starting cleanup after error...');
		await cleanupResources();
		console.log('📊 Updating status to ERROR...');
		await query(
			"UPDATE `pending-videos` SET status = 'ERROR' WHERE video_id = ?",
			[videoId]
		);
		console.log('💰 Refunding credits...');
		await query(
			'UPDATE `brainrot-users` SET credits = credits + ? WHERE id = ?',
			[credits, userId]
		);
		console.log('✅ Error handling completed');
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollPendingVideos() {
	while (true) {
		const rows = (await query(
			'SELECT * FROM `pending-videos` WHERE process_id = -1 ORDER BY timestamp ASC LIMIT 1',
			[]
		)) as RowDataPacket[];

		if (rows.length > 0) {
			console.log('Found pending video:', rows[0]);
			const video = rows[0];
			try {
				console.log('🚀 Starting mainFn...');

				// Extract all necessary parameters from the video record
				const videoMode = (video.video_mode as VideoMode) || 'brainrot';

				if (videoMode === 'rap') {
					// Handle rap mode with its specific parameters
					// Log the rapper being used
					console.log(`🎤 Using rapper: ${video.rapper}`);

					// Create parameters object with type assertion for rapper
					const params: Parameters<typeof mainFn> = [
						video.title,
						video.agent1 || '',
						video.agent2 || '',
						video.video_id,
						video.user_id,
						video.music || '',
						video.credits,
						videoMode,
						video.audio_url,
						video.lyrics,
						video.output_type as 'audio' | 'video',
						video.song_name,
						video.artist_name,
						video.rapper as any,
					];

					await mainFn(...params);
				} else {
					// Handle brainrot, podcast, monologue modes
					await mainFn(
						video.title,
						video.agent1,
						video.agent2,
						video.video_id,
						video.user_id,
						video.music,
						video.credits,
						videoMode
					);
				}
			} catch (error) {
				console.error(`exec error: ${error}`);
				await cleanupResources();
				await query(
					"UPDATE `pending-videos` SET status = 'ERROR' WHERE video_id = ?",
					[video.video_id]
				);
				await query(
					'UPDATE `brainrot-users` SET credits = credits + ? WHERE id = ?',
					[video.credits, video.user_id]
				);
			}
		} else {
			console.log('No pending videos found, sleeping for 5 seconds...');
			await sleep(3000);
		}
		await sleep(3000);
	}
}

(async () => {
	try {
		console.log(`Starting to poll for pending videos...`);
		await pollPendingVideos();
	} catch (error) {
		console.error('Error polling for pending videos:', error);
	}
})();
