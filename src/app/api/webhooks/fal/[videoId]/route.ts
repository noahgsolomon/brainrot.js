import { FAL_JOB_KEY_HEADER, verifyFalWebhookKey } from "@/lib/fal-jobs";
import { db } from "@/server/db";
import {
  brainrotusers,
  pendingVideos,
  rapAudio,
  videos,
} from "@/server/db/schemas/users/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const falWebhookSchema = z.object({
  requestId: z.string().max(255).optional(),
  status: z.string().min(1).max(500),
  progress: z.number().int().min(0).max(100).optional(),
  url: z.string().max(1000).optional(),
  error: z.string().optional(),
});

function isCompletedStatus(status: string) {
  return status.toUpperCase() === "COMPLETED";
}

function isErrorStatus(status: string) {
  return status.toUpperCase() === "ERROR";
}

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } },
) {
  try {
    const jobKey = request.headers.get(FAL_JOB_KEY_HEADER);

    if (!jobKey) {
      return new Response("Missing fal job key", { status: 401 });
    }

    const payload = falWebhookSchema.parse(await request.json());
    const pendingVideo = await db.query.pendingVideos.findFirst({
      where: eq(pendingVideos.videoId, params.videoId),
    });

    if (!pendingVideo) {
      return new Response("Pending video not found", { status: 404 });
    }

    if (!verifyFalWebhookKey(jobKey, pendingVideo.falWebhookKeyHash ?? null)) {
      return new Response("Invalid fal job key", { status: 401 });
    }

    await db.transaction(async (tx) => {
      const updates: Partial<typeof pendingVideos.$inferInsert> = {
        status: payload.status,
        processId: 0,
        falLastWebhookAt: new Date(),
      };

      if (payload.requestId) {
        updates.falRequestId = payload.requestId;
      }

      if (payload.progress !== undefined) {
        updates.progress = payload.progress;
      }

      if (payload.url) {
        updates.url = payload.url;
      }

      if (payload.error) {
        updates.falError = payload.error;
      }

      if (isCompletedStatus(payload.status)) {
        if (!payload.url) {
          throw new Error("Completed fal webhook missing media URL");
        }

        updates.progress = 100;
        updates.status = "COMPLETED";

        if (
          pendingVideo.videoMode === "rap" &&
          pendingVideo.outputType === "audio"
        ) {
          const existingRapAudio = await tx.query.rapAudio.findFirst({
            where: eq(rapAudio.video_id, pendingVideo.videoId),
          });

          if (!existingRapAudio) {
            await tx.insert(rapAudio).values({
              user_id: pendingVideo.user_id,
              rapper: pendingVideo.rapper ?? "",
              song_name: pendingVideo.songName ?? "",
              artist_name: pendingVideo.artistName ?? "",
              url: payload.url,
              video_id: pendingVideo.videoId,
            });
          }
        } else {
          const existingVideo = await tx.query.videos.findFirst({
            where: eq(videos.videoId, pendingVideo.videoId),
          });

          if (!existingVideo) {
            await tx.insert(videos).values({
              user_id: pendingVideo.user_id,
              agent1: pendingVideo.agent1 ?? "",
              agent2: pendingVideo.agent2 ?? "",
              title: pendingVideo.title ?? "",
              url: payload.url,
              videoId: pendingVideo.videoId,
            });
          }
        }
      }

      if (isErrorStatus(payload.status)) {
        updates.status = "ERROR";

        if (pendingVideo.status !== "ERROR") {
          const user = await tx.query.brainrotusers.findFirst({
            where: eq(brainrotusers.id, pendingVideo.user_id),
          });

          if (user) {
            await tx
              .update(brainrotusers)
              .set({
                credits: user.credits + pendingVideo.credits,
              })
              .where(eq(brainrotusers.id, user.id));
          }
        }
      }

      await tx
        .update(pendingVideos)
        .set(updates)
        .where(eq(pendingVideos.id, pendingVideo.id));
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: "Invalid fal webhook payload",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Error processing fal webhook:", error);
    return new Response(
      `Webhook Error: ${
        error instanceof Error ? error.message : "Unknown Error"
      }`,
      { status: 500 },
    );
  }
}
