import { db } from "@/server/db";
import { pendingVideos } from "@/server/db/schemas/users/schema";
import { ServiceBusClient } from "@azure/service-bus";

// Ensure the connection string is available
const connectionString = process.env.AZURE_BUS_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    "AZURE_BUS_CONNECTION_STRING environment variable is not set",
  );
}

const queueName = "taskqueue";

async function sendMessageToQueue(body: any) {
  const sbClient = new ServiceBusClient(connectionString!);
  const sender = sbClient.createSender(queueName);

  const message = {
    body: JSON.stringify({
      body: {
        user_id: body.userId,
        agent1: body.agent1,
        agent2: body.agent2,
        title: body.topic,
        videoId: body.videoId,
        url: "",
        timestamp: new Date(),
        duration: body.duration ?? 1,
        music: body.music ?? "NONE",
        background:
          body.background !== null
            ? body.background
            : Math.random() < 0.33
            ? "MINECRAFT"
            : Math.random() > 0.5
            ? "GTA"
            : "TRUCK",
        fps: body.fps ?? 20,
        aiGeneratedImages: body.aiGeneratedImages,
        cleanSrt: false,
        credits: body.credits,
        status: "Waiting in Queue",
      },
    }),
  };

  try {
    await sender.sendMessages(message);
    console.log(`Sent message: ${message.body}`);
  } finally {
    await sender.close();
    await sbClient.close();
  }
}

async function insertRecordToDB(body: any) {
  await db.insert(pendingVideos).values({
    user_id: body.userId,
    agent1: body.agent1,
    agent2: body.agent2,
    title: body.topic,
    videoId: body.videoId,
    url: "",
    timestamp: new Date(),
    duration: body.duration ?? 1,
    music: body.music ?? "NONE",
    background:
      body.background !== null
        ? body.background
        : Math.random() < 0.33
        ? "MINECRAFT"
        : Math.random() > 0.5
        ? "GTA"
        : "TRUCK",
    fps: body.fps ?? 20,
    aiGeneratedImages: body.aiGeneratedImages,
    cleanSrt: false,
    credits: body.credits,
    status: "Waiting in Queue",
  });
}

export async function POST(request: Request) {
  try {
    const body = JSON.parse(await request.text());

    // Send message to the queue
    await sendMessageToQueue(body);

    // Insert record into the database
    await insertRecordToDB(body);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
