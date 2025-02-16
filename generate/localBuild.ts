import transcribe from './transcribe';
import path from 'path';
import { exec } from 'child_process';
import { rm, mkdir, unlink } from 'fs/promises';

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
	let agentAIndex = Math.floor(Math.random() * agents.length);
	let agentBIndex;

	do {
		agentBIndex = Math.floor(Math.random() * agents.length);
	} while (agentAIndex === agentBIndex);

	const agentA = agents[0];
	const agentB = agents[1];

	const videoTopic =
		'Jordan Peterson is being eaten by a bear and joe rogan is trying to kiss the bear';
	const fps = 60;

	const music = 'WII_SHOP_CHANNEL_TRAP';

	await transcribe({
		local,
		topic: videoTopic,
		agentA,
		agentB,
		fps,
		music,
		videoId: '123',
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
