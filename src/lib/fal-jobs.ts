import { createHash, randomBytes, timingSafeEqual } from "crypto";

import { absoluteUrl } from "@/lib/utils";

export const FAL_JOB_KEY_HEADER = "x-brainrot-job-key";

export function createFalWebhookKey() {
  return randomBytes(32).toString("hex");
}

export function hashFalWebhookKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function buildFalWebhookHeaders(jobKey: string) {
  return {
    [FAL_JOB_KEY_HEADER]: jobKey,
  };
}

export function verifyFalWebhookKey(
  providedKey: string | null,
  expectedHash: string | null,
) {
  if (!providedKey || !expectedHash) {
    return false;
  }

  const actualHash = hashFalWebhookKey(providedKey);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");

  if (
    expectedBuffer.length === 0 ||
    expectedBuffer.length !== actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function buildFalWebhookUrl(videoId: string) {
  return absoluteUrl(`/api/webhooks/fal/${videoId}`);
}
