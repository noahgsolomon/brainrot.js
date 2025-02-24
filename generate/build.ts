import generateBrainrot from './modes/brainrot/generate';
import { rm, mkdir, unlink } from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { query } from './dbClient';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RowDataPacket } from 'mysql2';

type VideoMode = 'brainrot' | 'podcast' | 'monologue';

const execP = promisify(exec);

dotenv.config();

async function cleanupResources() {
	try {
		await rm(path.join('public', 'srt'), { recursive: true, force: true });
		await rm(path.join('public', 'voice'), { recursive: true, force: true });
		await unlink(path.join('public', `audio.mp3`)).catch((e) =>
			console.error(e)
		);
		await unlink(path.join('src', 'tmp', 'context.tsx')).catch((e) =>
			console.error(e)
		);
		await mkdir(path.join('public', 'srt'), { recursive: true });
		await mkdir(path.join('public', 'voice'), { recursive: true });
	} catch (err) {
		console.error(`Error during cleanup: ${err}`);
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
	videoMode: VideoMode
) {
	await cleanupResources();
	console.log('🚀 Starting mainFn with:', {
		topic,
		agentA,
		agentB,
		videoId,
		userId,
		videoMode,
	});
	try {
		console.log('📝 Updating process_id in pending-videos...');
		await query(
			'UPDATE `pending-videos` SET process_id = ? WHERE video_id = ?',
			[0, videoId]
		);
		console.log('✅ Process ID updated successfully');

		console.log('🎙️ Starting transcription function...');
		await generateBrainrot({
			local,
			topic,
			agentA,
			agentB,
			music,
			videoId,
		});
		console.log('✅ Transcription completed successfully');

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
				await mainFn(
					video.title,
					video.agent1,
					video.agent2,
					video.video_id,
					video.user_id,
					video.music,
					video.credits,
					video.video_mode as VideoMode
				);
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
