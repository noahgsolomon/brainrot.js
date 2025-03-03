import generateBrainrot from './modes/brainrot/generate';
import path from 'path';
import { exec } from 'child_process';
import { rm, mkdir, unlink, rename } from 'fs/promises';
import generateRap from './modes/rap/generate';
import { FAMILY_MATTERS_LYRICS } from './lyrics';

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

const agents = ['JORDAN_PETERSON', 'JOE_ROGAN'];

const local = true;

async function main() {
	await cleanupResources();
	console.log('Starting local build');
	console.log('MODE:', process.env.MODE);

	const videoMode = 'rap' as VideoMode;
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
				'Jordan Peterson gives a lecture about the importance of cleaning your room';
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
				'Jordan Peterson is being eaten by a bear and joe rogan is trying to kiss the bear';
			const agentA = agents[0];
			const agentB = agents[1];
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
