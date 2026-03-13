import "server-only";

import { fal } from "@fal-ai/client";

import { buildFalWebhookHeaders } from "@/lib/fal-jobs";

const DEFAULT_FAL_SMOKE_TEST_ENDPOINT =
  "noah-t9ec484ea829/remotion-proxy-spike";
const DEFAULT_FAL_SMOKE_TEST_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

interface SubmitFalSmokeTestOptions {
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

function getFalSmokeTestEndpointId() {
  return (
    process.env.FAL_REMOTION_SPIKE_ENDPOINT_ID ??
    DEFAULT_FAL_SMOKE_TEST_ENDPOINT
  );
}

export async function submitFalSmokeTest({
  videoId,
  webhookUrl,
  webhookKey,
}: SubmitFalSmokeTestOptions) {
  fal.config({
    credentials: getFalCredentials(),
  });

  return fal.queue.submit(getFalSmokeTestEndpointId(), {
    input: {
      job_id: videoId,
      composition_id: "Video",
      props: {
        source: "brainrot-test-page",
        video_id: videoId,
      },
      callback_url: webhookUrl,
      callback_headers: buildFalWebhookHeaders(webhookKey),
      step_delay_seconds: 5,
      final_url:
        process.env.FAL_TEST_VIDEO_URL ?? DEFAULT_FAL_SMOKE_TEST_VIDEO_URL,
    },
    startTimeout: 60,
  });
}
