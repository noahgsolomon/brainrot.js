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
  });

  return new Response(null, { status: 200 });
}
