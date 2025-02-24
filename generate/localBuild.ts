import generateBrainrot from './modes/brainrot/generate';
import path from 'path';
import { exec } from 'child_process';
import { rm, mkdir, unlink } from 'fs/promises';
import generateRap from './modes/rap/generate';

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

	const mode = 'rap' as VideoMode;

	// Mode-specific configuration
	let videoTopic: string;

	switch (mode) {
		case 'podcast':
			videoTopic =
				'Joe Rogan interviews Jordan Peterson about consciousness and DMT';
			break;
		case 'monologue':
			videoTopic =
				'Jordan Peterson gives a lecture about the importance of cleaning your room';
			break;
		case 'rap':
			videoTopic = 'Spongebob raps about his love for Patrick Star';
			await generateRap({
				local,
				topic: videoTopic,
				rapper: 'SPONGEBOB',
				lyrics: '',
				audioUrl:
					'https://cdn-spotify.zm.io.vn/stream/59J5nzL1KniFHnU120dQzt/USUM71702277',
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
		exec('bun run build', async (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			console.log(`stdout: ${stdout}`);
			console.error(`stderr: ${stderr}`);

			cleanupResources();
		});
	} else {
		console.log('Studio mode: Skipping build step');
	}
}

(async () => {
	await main();
})();
