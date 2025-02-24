export function srtTimeToSeconds(srtTime: string) {
	const [hours, minutes, secondsAndMillis] = srtTime.split(':');
	const [seconds, milliseconds] = secondsAndMillis.split(',');
	return (
		Number(hours) * 3600 +
		Number(minutes) * 60 +
		Number(seconds) +
		Number(milliseconds) / 1000
	);
}

export function secondsToSrtTime(seconds: number) {
	const pad = (num: number, size: number) => String(num).padStart(size, '0');
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const millis = Math.round((seconds % 1) * 1000);
	return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

export const transcribeAudio = async (audios: string[]) => {
	const retryDelays = [1000, 2000, 3000]; // Retry delays in milliseconds
	let retryCount = 0;

	while (retryCount < retryDelays.length) {
		try {
			const response = await fetch('http://127.0.0.1:5005/transcribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ audios }),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Process each segment to ensure it has words
			return ((data ?? []) as any[]).map(
				([transcription, audioPath]: [any, string]) => {
					const processedTranscription = {
						...transcription,
						segments: transcription.segments.map((segment: any) => ({
							...segment,
							words:
								segment.words ||
								segment.text.split(' ').map((word: string, index: number) => ({
									text: word,
									start:
										segment.start +
										index *
											((segment.end - segment.start) /
												segment.text.split(' ').length),
									end:
										segment.start +
										(index + 1) *
											((segment.end - segment.start) /
												segment.text.split(' ').length),
								})),
						})),
					};

					return [processedTranscription, audioPath];
				}
			);
		} catch (error) {
			console.error(
				`Error transcribing audio (attempt ${retryCount + 1}):`,
				error
			);

			if (retryCount < retryDelays.length - 1) {
				const delay = retryDelays[retryCount];
				console.log(`Retrying in ${delay / 1000} second(s)...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			} else {
				throw error;
			}

			retryCount++;
		}
	}
};
