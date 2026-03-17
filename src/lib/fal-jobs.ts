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
  const expectedBuffer = new Uint8Array(Buffer.from(expectedHash, "hex"));
  const actualBuffer = new Uint8Array(Buffer.from(actualHash, "hex"));

  if (
    expectedBuffer.length === 0 ||
    expectedBuffer.length !== actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function getFalWebhookBaseUrl() {
  const configuredBaseUrl =
    process.env.FAL_WEBHOOK_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.WEBSITE ? `https://${process.env.WEBSITE}` : null);

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return absoluteUrl("").replace(/\/$/, "");
}

export function buildFalWebhookUrl(videoId: string) {
  return `${getFalWebhookBaseUrl()}/api/webhooks/fal/${videoId}`;
}

export function isLocalWebhookUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}
