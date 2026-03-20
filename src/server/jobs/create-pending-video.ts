import "server-only";

import { z } from "zod";

import {
  buildFalWebhookUrl,
  createFalWebhookKey,
  hashFalWebhookKey,
} from "@/lib/fal-jobs";
import { serializeSpeakerNamesForStorage } from "@/lib/brainrot-speakers";
import { MAX_VIDEO_TOPIC_LENGTH } from "@/lib/video-topic";
import {
  createInitialTimingState,
  serializeTimingState,
} from "@/server/jobs/generation-timing";
import { db } from "@/server/db";
import { pendingVideos } from "@/server/db/schemas/users/schema";

export const createPendingVideoJobSchema = z.object({
  userId: z.number().int().positive(),
  agents: z.array(z.string().max(100)).optional().nullable(),
  agent1: z.string().max(100).optional().nullable(),
  agent2: z.string().max(100).optional().nullable(),
  title: z.string().max(MAX_VIDEO_TOPIC_LENGTH),
  videoId: z.string().min(1).max(100),
  music: z.string().max(100).optional().nullable(),
  credits: z.number().int().nonnegative(),
  videoMode: z.string().min(1).max(20),
  outputType: z.string().max(20).optional().nullable(),
  lyrics: z.string().optional().nullable(),
  audioUrl: z.string().max(1000).optional().nullable(),
  songName: z.string().max(255).optional().nullable(),
  artistName: z.string().max(255).optional().nullable(),
  rapper: z.string().max(255).optional().nullable(),
});

export type CreatePendingVideoJobInput = z.infer<
  typeof createPendingVideoJobSchema
>;

export async function createPendingVideoJob(input: CreatePendingVideoJobInput) {
  const job = createPendingVideoJobSchema.parse(input);
  const falWebhookKey = createFalWebhookKey();
  const createdAt = new Date();
  const initialTimingState = createInitialTimingState(createdAt);

  await db.insert(pendingVideos).values({
    user_id: job.userId,
    agents: serializeSpeakerNamesForStorage(job.agents ?? []),
    agent1: job.agent1 ?? null,
    agent2: job.agent2 ?? null,
    title: job.title,
    videoId: job.videoId,
    url: "",
    timestamp: createdAt,
    music: job.music ?? "WII_SHOP_CHANNEL_TRAP",
    credits: job.credits,
    status: "Waiting in Queue",
    videoMode: job.videoMode,
    outputType: job.outputType ?? null,
    lyrics: job.lyrics ?? null,
    audioUrl: job.audioUrl ?? null,
    songName: job.songName ?? null,
    artistName: job.artistName ?? null,
    rapper: job.rapper ?? null,
    falWebhookKeyHash: hashFalWebhookKey(falWebhookKey),
    phaseKey: initialTimingState.currentPhaseKey,
    phaseStartedAt: createdAt,
    timingState: serializeTimingState(initialTimingState),
  });

  return {
    videoId: job.videoId,
    falWebhookKey,
    falWebhookUrl: buildFalWebhookUrl(job.videoId),
  };
}
