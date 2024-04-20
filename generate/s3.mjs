import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region:'us-east-1',
};

// Initialize S3Client with explicit credentials
const s3Client = new S3Client({
    credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
    },
    region: credentials.region,
});

async function uploadFileToS3(filePath, bucketName) {
	const fileStream = fs.createReadStream(filePath);
	const key = `videos/${uuidv4()}.mp4`;

	try {
		const data = await s3Client.send(
			new PutObjectCommand({
				Bucket: bucketName,
				Key: key,
				Body: fileStream,
				ContentType: 'video/mp4',
			})
		);
		console.log(`File uploaded successfully!`);
		return `https://images.smart.wtf/${key}`;
	} catch (err) {
		console.error('Error uploading file: ', err);
		throw new Error(err);
	}
}

const bucketName = 'smartimagebucket';
const videoPath = path.join('out', 'wtf.mp4');
const s3Url = await uploadFileToS3(videoPath, bucketName);
console.log(`Video URL: ${s3Url}`);