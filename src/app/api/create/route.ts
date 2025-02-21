import { db } from "@/server/db";
import { pendingVideos, brainrotusers } from "@/server/db/schemas/users/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function insertRecordToDB(body: any, userId: number) {
  await db.insert(pendingVideos).values({
    user_id: userId,
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
    fps: body.fps ?? 30,
    aiGeneratedImages: true,
    cleanSrt: false,
    credits: body.credits,
    status: "Waiting in Queue",
  });
}

export async function POST(request: Request) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized - No API key provided", {
        status: 401,
      });
    }
    const apiKey = authHeader.split(" ")[1];

    if (!apiKey) {
      return new Response("Unauthorized - Invalid API key format", {
        status: 401,
      });
    }

    // Validate API key and get user
    const user = await db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.apiKey, apiKey),
    });

    if (!user) {
      return new Response("Unauthorized - Invalid API key", { status: 401 });
    }

    const body = JSON.parse(await request.text());

    // Insert record into the database using the user_id from the API key lookup
    await insertRecordToDB(body, user.id);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
