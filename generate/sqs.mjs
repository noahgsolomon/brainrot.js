import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';

dotenv.config();

const sqsClient = new SQSClient({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: 'us-east-1',
});

async function sendMessage(queueUrl, messageBody) {
	try {
		const params = {
			QueueUrl: queueUrl,
			MessageBody: JSON.stringify(messageBody),
			MessageGroupId: 'example-group-id',
			MessageDeduplicationId: 'example-deduplication-id',
		};

		const command = new SendMessageCommand(params);
		const response = await sqsClient.send(command);
		console.log('Message sent successfully:', response);
	} catch (error) {
		console.error('Error sending message:', error);
	}
}

const queueUrl =
	'https://sqs.us-east-1.amazonaws.com/604711046876/brainrot.fifo';
const messageBody = { key: 'value', example: 'data' };

sendMessage(queueUrl, messageBody);
