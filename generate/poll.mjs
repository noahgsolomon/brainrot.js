import { query } from './dbClient.mjs';

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollPendingVideos() {
	while (true) {
		const rows = await query(
			'SELECT * FROM `pending-videos` ORDER BY timestamp ASC LIMIT 1',
			[]
		);

		if (rows.length > 0) {
			console.log('Found pending video:', rows[0]);
			console.log(rows[0].title);
			console.log(rows[0].agent1);
			console.log(rows[0].agent2);
			console.log(rows[0].user_id);
			console.log(rows[0].video_id);
		} else {
			console.log('No pending videos found, sleeping for 15 seconds...');
			await sleep(15000);
		}
		await sleep(15000);
	}
}

(async () => {
	try {
		console.log('Starting to poll for pending videos...');
		await pollPendingVideos();
	} catch (error) {
		console.error('Error polling for pending videos:', error);
	}
})();
