import "server-only";

import { fal } from "@fal-ai/client";

import { buildFalWebhookHeaders } from "@/lib/fal-jobs";

const DEFAULT_FAL_REMOTION_SPIKE_ENDPOINT =
  "noah-t9ec484ea829/remotion-proxy-spike";

interface SubmitFalBrainrotRenderJobOptions {
  videoId: string;
  webhookUrl: string;
  webhookKey: string;
  topic: string;
  agentA: string;
  agentB: string;
  music: string;
  pitchMode?: boolean;
}

function getFalCredentials() {
  const credentials = process.env.FAL_KEY;

  if (!credentials) {
    throw new Error("FAL_KEY is not configured on the server.");
  }

  return credentials;
}

function getFalRemotionSpikeEndpointId() {
  return (
    process.env.FAL_REMOTION_SPIKE_ENDPOINT_ID ??
    DEFAULT_FAL_REMOTION_SPIKE_ENDPOINT
  );
}

export async function submitFalBrainrotRenderJob({
  videoId,
  webhookUrl,
  webhookKey,
  topic,
  agentA,
  agentB,
  music,
  pitchMode = false,
}: SubmitFalBrainrotRenderJobOptions) {
  fal.config({
    credentials: getFalCredentials(),
  });

  return fal.queue.submit(getFalRemotionSpikeEndpointId(), {
    input: {
      job_id: videoId,
      composition_id: "Video",
      props: {
        pipeline: "brainrot_lambda_render",
        topic,
        agentA,
        agentB,
        music,
        pitchMode,
        video_id: videoId,
      },
      callback_url: webhookUrl,
      callback_headers: buildFalWebhookHeaders(webhookKey),
    },
    startTimeout: 120,
  });
}

export async function submitFalBrainrotRenderTest({
  videoId,
  webhookUrl,
  webhookKey,
}: Omit<
  SubmitFalBrainrotRenderJobOptions,
  "topic" | "agentA" | "agentB" | "music"
>) {
  return submitFalBrainrotRenderJob({
    videoId,
    webhookUrl,
    webhookKey,
    topic: "fal spike migration",
    agentA: "JOE_ROGAN",
    agentB: "JOE_BIDEN",
    music: "WII_SHOP_CHANNEL_TRAP",
    pitchMode: false,
  });
}
