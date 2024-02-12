import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

export default function concatenateAudioFiles() {
	const directoryPath = 'public/voice/';
	const silenceAudioFile = 'public/silence.mp3';

	if (!fs.existsSync('tmp/')) {
		fs.mkdirSync('tmp/');
	}

	const files = fs
		.readdirSync(directoryPath)
		.filter((file) => file.endsWith('.mp3') && !file.startsWith('silence'));

	files.sort((a, b) => {
		const numberA = parseInt(a.split('-')[1], 10);
		const numberB = parseInt(b.split('-')[1], 10);
		return numberA - numberB;
	});

	const command = ffmpeg();

	files.forEach((file, index) => {
		console.log('Adding file to ffmpeg:', file);
		command.input(path.join(directoryPath, file));
		if (index < files.length - 1) {
			console.log('Adding silence to ffmpeg');
			command.input(silenceAudioFile);
		}
	});

	command
		.on('start', (commandLine) => {
			console.log('Spawned Ffmpeg with command:', commandLine);
		})
		.on('error', (err) => {
			console.log('Error:', err.message);
		})
		.on('end', () => {
			console.log('Finished concatenating audio files!');
		})
		.mergeToFile('public/audio.mp3', 'tmp/');
}
