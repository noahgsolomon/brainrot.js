import { db } from "@/server/db";
import { brainrotusers } from "@/server/db/schemas/users/schema";
import { createPendingVideoJob } from "@/server/jobs/create-pending-video";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  topic: z.string().min(1).max(1000),
  agent1: z.string().max(100).optional(),
  agent2: z.string().max(100).optional(),
  videoId: z.string().min(1).max(100),
  music: z.string().max(100).optional(),
  credits: z.number().int().nonnegative(),
  videoMode: z.string().min(1).max(20),
  outputType: z.string().max(20).optional(),
  lyrics: z.string().optional(),
  audioUrl: z.string().max(1000).optional(),
  songName: z.string().max(255).optional(),
  artistName: z.string().max(255).optional(),
  rapper: z.string().max(255).optional(),
});

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

    const body = createRequestSchema.parse(await request.json());

    // Insert record into the database using the user_id from the API key lookup
    const pendingVideo = await createPendingVideoJob({
      userId: user.id,
      agent1: body.agent1,
      agent2: body.agent2,
      title: body.topic,
      videoId: body.videoId,
      music: body.music,
      credits: body.credits,
      videoMode: body.videoMode,
      outputType: body.outputType,
      lyrics: body.lyrics,
      audioUrl: body.audioUrl,
      songName: body.songName,
      artistName: body.artistName,
      rapper: body.rapper,
    });

    return Response.json(
      {
        ok: true,
        videoId: pendingVideo.videoId,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: "Invalid create payload", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Error processing POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
