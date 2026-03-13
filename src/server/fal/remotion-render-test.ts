import "server-only";

import { fal } from "@fal-ai/client";

import { buildFalWebhookHeaders } from "@/lib/fal-jobs";

const DEFAULT_FAL_REMOTION_SPIKE_ENDPOINT =
  "noah-t9ec484ea829/remotion-proxy-spike";

interface SubmitFalRemotionRenderTestOptions {
  videoId: string;
  webhookUrl: string;
  webhookKey: string;
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

export async function submitFalRemotionRenderTest({
  videoId,
  webhookUrl,
  webhookKey,
}: SubmitFalRemotionRenderTestOptions) {
  fal.config({
    credentials: getFalCredentials(),
  });

  return fal.queue.submit(getFalRemotionSpikeEndpointId(), {
    input: {
      job_id: videoId,
      composition_id: "BlackRenderTest",
      props: {
        pipeline: "remotion_black_render",
        title: "fal remotion render test",
        video_id: videoId,
      },
      callback_url: webhookUrl,
      callback_headers: buildFalWebhookHeaders(webhookKey),
    },
    startTimeout: 120,
  });
}
