import transcribe from './transcribe';
import path from 'path';
import { exec } from 'child_process';
import { rm, mkdir, unlink } from 'fs/promises';

type VideoMode = 'brainrot' | 'podcast' | 'monologue';

async function cleanupResources() {
	try {
		await rm(path.join('public', 'srt'), { recursive: true, force: true });
		await rm(path.join('public', 'voice'), { recursive: true, force: true });
		await unlink(path.join('public', `audio.mp3`)).catch((e) =>
			console.error(e),
		);
		await unlink(path.join('src', 'tmp', 'context.tsx')).catch((e) =>
			console.error(e),
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

	// Note: Not sure why this is here. Commenting out for now.
	// let agentAIndex = Math.floor(Math.random() * agents.length);
	// let agentBIndex;

	// do {
	// 	agentBIndex = Math.floor(Math.random() * agents.length);
	// } while (agentAIndex === agentBIndex);
	
	// Get video mode from environment or default to 'brainrot'
	const mode = (process.env.VIDEO_MODE as VideoMode) || 'brainrot';
	console.log('Video Mode:', mode);

	const agentA = agents[0];
	const agentB = agents[1];
	const fps = 60;
	const music = 'WII_SHOP_CHANNEL_TRAP';

	// Mode-specific configuration
	let videoTopic: string;
	let useBackground = true;

	switch (mode) {
		case 'podcast':
			videoTopic = 'Joe Rogan interviews Jordan Peterson about consciousness and DMT';
			useBackground = false;
			break;
		case 'monologue':
			videoTopic = 'Jordan Peterson gives a lecture about the importance of cleaning your room';
			useBackground = false;
			break;
		case 'brainrot':
		default:
			videoTopic = 'Jordan Peterson is being eaten by a bear and joe rogan is trying to kiss the bear';
			useBackground = true;
			break;
	}

	await transcribe({
		local,
		topic: videoTopic,
		agentA,
		agentB,
		fps,
		music,
		videoId: '123',
		mode,
		useBackground,
	});

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
