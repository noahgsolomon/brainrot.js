import { db } from "@/server/db";
import { pendingVideos } from "@/server/db/schemas/users/schema";

export async function POST(request: Request) {
  const body = JSON.parse(await request.text());

  await db.insert(pendingVideos).values({
    user_id: body.userId,
    agent1: body.agent1,
    agent2: body.agent2,
    title: body.topic,
    videoId: body.videoId,
    url: "",
    timestamp: new Date(),
    duration: body.duration ?? 1,
    music: body.music ?? "WII_SHOP_CHANNEL_TRAP",
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
    cleanSrt: body.cleanSrt,
    credits: body.credits,
    status: "Waiting in Queue",
  });

  return new Response(null, { status: 200 });
}
