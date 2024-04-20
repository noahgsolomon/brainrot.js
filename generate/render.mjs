import { query } from '../generate/dbClient.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';

(async () => {
	const execP = promisify(exec);

	const { stdout, stderr } = await execP(
		'npx remotion lambda sites create src/index.ts --site-name=brainrot'
	);
	console.log(`stdout: ${stdout}`);
	if (stderr) console.error(`stderr: ${stderr}`);
	console.log(`stdout: ${stdout}`);
	if (stderr) console.error(`stderr: ${stderr}`);

	const regexServeUrl =
		/https:\/\/[\w-]+\.s3\.us-east-1\.amazonaws\.com\/sites\/[\w-]+\/index\.html/;

	const matchServeUrl = stdout.match(regexServeUrl);

	console.log('Serve URL: ' + matchServeUrl);

	const { stdout: stdoutRender, stderr: stderrRender } = await execP(
		'npx remotion lambda render https://remotionlambda-useast1-oaz2rkh49x.s3.us-east-1.amazonaws.com/sites/brainrot/index.html Video'
	);

	const regex =
		/https:\/\/s3\.us-east-1\.amazonaws\.com\/[\w-]+\/renders\/[\w-]+\/out\.mp4/;
	const match = stdoutRender.match(regex);

	let s3Url = '';
	if (match) {
		s3Url = match[0];
		console.log(s3Url);
	} else {
		throw new Error('No S3 URL found in the output');
	}
})();
