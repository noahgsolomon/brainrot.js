import { exec } from 'child_process';

export default function getAudioDuration(filePath) {
	return new Promise((resolve, reject) => {
		exec(
			`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
			(error, stdout, stderr) => {
				if (error) {
					console.error('Error getting audio duration:', error);
					return reject(new Error('Failed to get audio duration'));
				}
				const duration = parseFloat(stdout.trim());
				resolve(duration);
			}
		);
	});
}
