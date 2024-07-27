import { db } from "@/server/db";
import { pendingVideos } from "@/server/db/schemas/users/schema";

export const dynamic = "force-dynamic";

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

    // Insert record into the database
    await insertRecordToDB(body);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
