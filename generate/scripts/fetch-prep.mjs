#!/usr/bin/env node

/**
 * Fetches generated prep artifacts (audio, SRTs, context) from the FAL
 * brainrot_prep_upload pipeline and stages them locally so that
 * `npx remotion studio` can run.
 *
 * Usage:
 *   node scripts/fetch-prep.mjs \
 *     --topic "AI taking over the world" \
 *     --agentA BARACK_OBAMA \
 *     --agentB JORDAN_PETERSON \
 *     --music WII_SHOP_CHANNEL_TRAP \
 *     --pitchMode
 *
 * Reads FAL_KEY from the root .env file automatically.
 */

import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENERATE_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(GENERATE_DIR, "..");

// ---------------------------------------------------------------------------
// Load .env from repo root (so we don't need FAL_KEY= prefix on every run)
// ---------------------------------------------------------------------------

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found — that's fine, rely on env vars
  }
}

loadEnvFile(path.join(REPO_ROOT, ".env"));

const { fal } = await import("@fal-ai/client");

const DEFAULT_FAL_APP_ID = "noah-t9ec484ea829/remotion-proxy-spike";
const POLL_INTERVAL_MS = 3_000;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw?.startsWith("--")) continue;
    const key = raw.replace(/^--/, "");
    const value = argv[i + 1];
    if (key && value && !value.startsWith("--")) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const topic = args.topic;
const agentA = args.agentA || "BARACK_OBAMA";
const agentB = args.agentB || "JORDAN_PETERSON";
const music = args.music || "WII_SHOP_CHANNEL_TRAP";
const videoFileName = args.videoFileName || "/background/MINECRAFT-1.mp4";
const mock = args.mock === "true";
const pitchMode = args.pitchMode === "true";

if (!topic) {
  console.error(
    "Usage: node scripts/fetch-prep.mjs --topic 'your topic' [--agentA X] [--agentB Y] [--music Z] [--pitchMode] [--mock]",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// FAL configuration
// ---------------------------------------------------------------------------

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("Error: FAL_KEY not found. Ensure it is set in the root .env file or as an environment variable.");
  process.exit(1);
}

const FAL_APP_ID =
  process.env.FAL_REMOTION_SPIKE_ENDPOINT_ID || DEFAULT_FAL_APP_ID;

fal.config({ credentials: FAL_KEY });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);
  console.log(`  Downloaded: ${path.relative(GENERATE_DIR, destPath)} (${buffer.length} bytes)`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Brainrot Prep Fetch ===\n");
  console.log(`  Topic:  ${topic}`);
  console.log(`  Agents: ${agentA} vs ${agentB}`);
  console.log(`  Music:  ${music}`);
  console.log(`  Mock:   ${mock}`);
  console.log(`  Pitch:  ${pitchMode}`);
  console.log(`  FAL:    ${FAL_APP_ID}`);
  console.log();

  // Step 1: Submit to FAL queue
  console.log("Submitting job to FAL queue...");
  const { request_id } = await fal.queue.submit(FAL_APP_ID, {
    input: {
      job_id: randomUUID(),
      composition_id: "Video",
      props: {
        pipeline: "brainrot_prep_upload",
        topic,
        agentA,
        agentB,
        music,
        videoFileName,
        ...(pitchMode ? { pitchMode: true } : {}),
        ...(mock ? { use_mock_services: true } : {}),
      },
    },
  });

  console.log(`  Request ID: ${request_id}`);
  console.log("\nWaiting for prep to complete...\n");

  // Step 2: Poll for status
  let lastLogIndex = 0;
  while (true) {
    const status = await fal.queue.status(FAL_APP_ID, {
      requestId: request_id,
      logs: true,
    });

    // Print any new logs
    const logs = status.logs || [];
    for (let i = lastLogIndex; i < logs.length; i++) {
      console.log(`  [fal] ${logs[i].message}`);
    }
    lastLogIndex = logs.length;

    if (status.status === "COMPLETED") {
      console.log("\nPrep completed!");
      break;
    }

    if (status.status === "FAILED") {
      console.error("\nPrep failed on FAL.");
      if (status.error) {
        console.error(`  Error: ${status.error}`);
      }
      process.exit(1);
    }

    // Show progress if available
    if (status.status === "IN_PROGRESS") {
      // Status is in progress, keep polling
    } else if (status.status === "IN_QUEUE") {
      process.stdout.write("  [queued] Waiting for worker...\r");
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // Step 3: Fetch the result
  const result = await fal.queue.result(FAL_APP_ID, {
    requestId: request_id,
  });

  const artifacts = result.data?.node?.artifacts ?? result.data?.artifacts;

  if (!artifacts) {
    console.error("Error: No artifacts in FAL response.");
    console.error(JSON.stringify(result.data, null, 2));
    process.exit(1);
  }

  console.log("\nDownloading artifacts...\n");

  // Step 4: Clean existing generated files
  const srtDir = path.join(GENERATE_DIR, "public", "srt");
  const debugDir = path.join(GENERATE_DIR, "public", "debug");
  const tmpDir = path.join(GENERATE_DIR, "src", "tmp");
  await fs.rm(srtDir, { recursive: true, force: true });
  await fs.rm(debugDir, { recursive: true, force: true });
  await fs.mkdir(srtDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.mkdir(debugDir, { recursive: true });

  // Step 5: Download and place files
  await downloadFile(
    artifacts.audioUrl,
    path.join(GENERATE_DIR, "public", "audio.mp3"),
  );

  await downloadFile(
    artifacts.contextUrl,
    path.join(GENERATE_DIR, "src", "tmp", "context.tsx"),
  );

  for (const srt of artifacts.srtFiles) {
    await downloadFile(srt.url, path.join(srtDir, srt.fileName));
  }

  if (artifacts.transcriptUrl) {
    await downloadFile(
      artifacts.transcriptUrl,
      path.join(GENERATE_DIR, "src", "tmp", "transcript.json"),
    );
  }

  if (artifacts.manifestUrl) {
    await downloadFile(
      artifacts.manifestUrl,
      path.join(GENERATE_DIR, "src", "tmp", "audio-manifest.json"),
    );
  }

  for (const audioFile of artifacts.originalVoiceFiles ?? []) {
    const relativePath =
      typeof audioFile.relativePath === "string" && audioFile.relativePath.length > 0
        ? audioFile.relativePath
        : path.join("voice", audioFile.fileName);
    await downloadFile(
      audioFile.url,
      path.join(debugDir, relativePath),
    );
  }

  for (const audioFile of artifacts.pitchVoiceFiles ?? []) {
    const relativePath =
      typeof audioFile.relativePath === "string" && audioFile.relativePath.length > 0
        ? audioFile.relativePath
        : path.join("voice-pitch", audioFile.fileName);
    await downloadFile(
      audioFile.url,
      path.join(debugDir, relativePath),
    );
  }

  console.log("\n=== Done! ===");
  console.log(`\nRun Remotion Studio:\n  cd ${GENERATE_DIR} && npx remotion studio\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
