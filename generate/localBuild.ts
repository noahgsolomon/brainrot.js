import generateBrainrot from './modes/brainrot/generate';
import path from 'path';
import { exec } from 'child_process';
import { rm, mkdir, unlink, rename } from 'fs/promises';
import generateRap from './modes/rap/generate';
import { FAMILY_MATTERS_LYRICS } from './lyrics';
import fs from 'fs';

async function cleanupResources() {
	try {
		// Clean up directories
		await rm(path.join('public', 'srt'), { recursive: true, force: true });
		await rm(path.join('public', 'voice'), { recursive: true, force: true });

		// Check if files exist before attempting to delete them
		const audioPath = path.join('public', `audio.mp3`);
		const contextPath = path.join('src', 'tmp', 'context.tsx');

		if (await fileExists(audioPath)) {
			await unlink(audioPath);
		}

		if (await fileExists(contextPath)) {
			await unlink(contextPath);
		}

		// Recreate directories
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

const agents = ['JORDAN_PETERSON', 'JOE_ROGAN'];

const local = true;

async function main() {
	await cleanupResources();
	console.log('Starting local build');
	console.log('MODE:', process.env.MODE);

	const videoMode = 'brainrot' as VideoMode;
	const agentA = 'BARACK_OBAMA';
	const agentB = 'JORDAN_PETERSON';
	const outputType = 'audio' as 'audio' | 'video';
	const songName = 'Family Matters';
	const artistName = 'Drake';
	const rapper = 'SPONGEBOB';

	// Mode-specific configuration
	let videoTopic: string;

	switch (videoMode) {
		case 'podcast':
			videoTopic =
				'Joe Rogan interviews Jordan Peterson about consciousness and DMT';
			break;
		case 'monologue':
			videoTopic =
				'obama wants to talk about waifu titties but jordan peterson wants to talk about how he does not support indian immigration into america. obama calls jordan a racist but jordan calls obama out for marrying michelle, or as jordan calls him michael because he thinks michelle obama is a born male. and obama claps back saying how he "did" mikhaila';
			break;
		case 'rap':
			const lyrics = FAMILY_MATTERS_LYRICS;
			const audioUrl =
				'https://cdn-spotify.zm.io.vn/stream/1wFFFzJ5EsKbBWZriAcubN/USUG12402984';
			await generateRap({
				local,
				rapper: 'SPONGEBOB',
				lyrics,
				audioUrl,
				outputType,
			});
			break;
		case 'brainrot':
			videoTopic =
				'obama wants to talk about waifu titties but jordan peterson wants to talk about how he does not support indian immigration into america. obama calls jordan a racist but jordan calls obama out for marrying michelle, or as jordan calls him michael because he thinks michelle obama is a born male. and obama claps back saying how he "did" mikhaila';
			const music = 'WII_SHOP_CHANNEL_TRAP';
			await generateBrainrot({
				local,
				topic: videoTopic,
				agentA,
				agentB,
				music,
			});
		default:
			break;
	}

	// Skip build step if in studio mode
	if (process.env.MODE !== 'studio') {
		if (videoMode === 'rap' && outputType === 'audio') {
			await rename(
				path.join('public', 'audio.mp3'),
				path.join('out', `${rapper}_${songName}_${artistName}.mp3`)
			);
			console.log(path.join('out', `${rapper}_${songName}_${artistName}.mp3`));
		} else {
			exec('bun run build', async (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				console.log(`stdout: ${stdout}`);
				console.error(`stderr: ${stderr}`);

				cleanupResources();
			});
		}
	} else {
		console.log('Studio mode: Skipping build step');
	}
}

(async () => {
	await main();
})();
