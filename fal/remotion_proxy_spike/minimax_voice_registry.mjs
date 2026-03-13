// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fal } from "@fal-ai/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRAINING_AUDIO_DIR_CANDIDATES = [
  path.resolve(__dirname, "../../training_audio"),
  "/app/training_audio",
];
const MUSIC_DIR_CANDIDATES = [
  path.resolve(__dirname, "../../generate/public/music"),
  "/app/remotion_runtime/public/music",
];

const TRAINING_AUDIO_FILE_MAP = {
  ANDREW_TATE: "tate.mp3",
  BARACK_OBAMA: "obama.mp3",
  BEN_SHAPIRO: "benshapiroaudio.mp3",
  DONALD_TRUMP: "trumpaudio.mp3",
  JOE_BIDEN: "joebidenaudio.mp3",
  JOE_ROGAN: "jreaudio.mp3",
  KAMALA_HARRIS: "kamala.mp3",
};

const uploadedTrainingAudioUrlPromises = new Map();
const customVoiceIdPromises = new Map();

let configuredFalKey = null;
let trainingAudioDirPromise = null;
let musicDirPromise = null;
let startupWarmupPromise = null;
const MINIMAX_VOICE_CLONE_TIMEOUT_MS = Number.parseInt(
  process.env.MINIMAX_VOICE_CLONE_TIMEOUT_MS ?? "120000",
  10,
);
const MINIMAX_TTS_TIMEOUT_MS = Number.parseInt(
  process.env.MINIMAX_TTS_TIMEOUT_MS ?? "90000",
  10,
);
const MINIMAX_AUDIO_DOWNLOAD_TIMEOUT_MS = Number.parseInt(
  process.env.MINIMAX_AUDIO_DOWNLOAD_TIMEOUT_MS ?? "30000",
  10,
);
const MINIMAX_TTS_MAX_ATTEMPTS = Number.parseInt(
  process.env.MINIMAX_TTS_MAX_ATTEMPTS ?? "3",
  10,
);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function assertAgentSupported(agentId) {
  if (!Object.hasOwn(TRAINING_AUDIO_FILE_MAP, agentId)) {
    throw new Error(
      `No MiniMax training audio configured for ${agentId}. Supported agents: ${Object.keys(
        TRAINING_AUDIO_FILE_MAP,
      ).join(", ")}`,
    );
  }
}

async function resolveExistingDirectory(candidates, label) {
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Could not find ${label}. Checked: ${candidates.join(", ")}`);
}

function getTrainingAudioDirectory() {
  trainingAudioDirPromise ??= resolveExistingDirectory(
    TRAINING_AUDIO_DIR_CANDIDATES,
    "bundled training audio directory",
  );
  return trainingAudioDirPromise;
}

function getMusicDirectory() {
  musicDirPromise ??= resolveExistingDirectory(
    MUSIC_DIR_CANDIDATES,
    "bundled music directory",
  );
  return musicDirPromise;
}

function ensureFalClientConfigured() {
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    throw new Error("Missing required environment variable: FAL_KEY");
  }

  if (configuredFalKey !== falKey) {
    fal.config({
      credentials: falKey,
    });
    configuredFalKey = falKey;
  }
}

function createNamedBlob(buffer, fileName, contentType) {
  const blob = new Blob([buffer], { type: contentType });
  return Object.assign(blob, { name: fileName });
}

function guessContentType(fileName) {
  if (fileName.toLowerCase().endsWith(".mp3")) {
    return "audio/mpeg";
  }

  return "application/octet-stream";
}

function memoizePromise(map, key, load) {
  if (map.has(key)) {
    return map.get(key);
  }

  const promise = Promise.resolve()
    .then(load)
    .catch((error) => {
      map.delete(key);
      throw error;
    });

  map.set(key, promise);
  return promise;
}

async function getTrainingAudioFilePath(agentId) {
  assertAgentSupported(agentId);
  const trainingAudioDir = await getTrainingAudioDirectory();
  return path.join(trainingAudioDir, TRAINING_AUDIO_FILE_MAP[agentId]);
}

export async function resolveBundledMusicPath(musicName) {
  const musicDir = await getMusicDirectory();
  const musicPath = path.join(musicDir, `${musicName}.MP3`);

  await fs.access(musicPath);
  return musicPath;
}

export async function getUploadedTrainingAudioUrl(agentId) {
  return memoizePromise(uploadedTrainingAudioUrlPromises, agentId, async () => {
    ensureFalClientConfigured();
    const trainingAudioPath = await getTrainingAudioFilePath(agentId);
    const fileName = path.basename(trainingAudioPath);
    console.log(
      JSON.stringify({
        type: "minimax_training_audio_upload_start",
        agentId,
        fileName,
      }),
    );
    const buffer = await fs.readFile(trainingAudioPath);
    const uploadable = createNamedBlob(
      buffer,
      fileName,
      guessContentType(fileName),
    );

    const uploadedUrl = await fal.storage.upload(uploadable, {
      lifecycle: {
        expiresIn: "30d",
      },
    });
    console.log(
      JSON.stringify({
        type: "minimax_training_audio_upload_done",
        agentId,
        uploadedUrl,
      }),
    );
    return uploadedUrl;
  });
}

export async function warmTrainingAudioUploads() {
  ensureFalClientConfigured();
  await getMusicDirectory();

  await Promise.all(
    Object.keys(TRAINING_AUDIO_FILE_MAP).map((agentId) =>
      getUploadedTrainingAudioUrl(agentId),
    ),
  );
}

export async function getCustomVoiceId(agentId) {
  assertAgentSupported(agentId);

  return memoizePromise(customVoiceIdPromises, agentId, async () => {
    ensureFalClientConfigured();
    const audioUrl = await getUploadedTrainingAudioUrl(agentId);
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        console.log(
          JSON.stringify({
            type: "minimax_voice_clone_start",
            agentId,
            audioUrl,
            attempt,
          }),
        );
        const result = await withTimeout(
          fal.subscribe("fal-ai/minimax/voice-clone", {
            input: {
              audio_url: audioUrl,
              noise_reduction: true,
              need_volume_normalization: true,
              accuracy: 0.8,
            },
          }),
          MINIMAX_VOICE_CLONE_TIMEOUT_MS,
          `MiniMax voice clone for ${agentId}`,
        );
        const customVoiceId = result.data?.custom_voice_id?.trim();

        if (!customVoiceId) {
          throw new Error(
            `MiniMax voice clone did not return a custom_voice_id for ${agentId}`,
          );
        }

        console.log(
          JSON.stringify({
            type: "minimax_voice_clone_done",
            agentId,
            customVoiceId,
            attempt,
          }),
        );

        return customVoiceId;
      } catch (error) {
        lastError = error;
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown error");

        console.warn(
          JSON.stringify({
            type: "minimax_voice_clone_retry",
            agentId,
            attempt,
            message,
          }),
        );

        if (attempt < 3) {
          await sleep(attempt * 3000);
        }
      }
    }

    throw new Error(
      `MiniMax voice clone failed for ${agentId} after 3 attempts: ${
        lastError instanceof Error ? lastError.message : "unknown error"
      }`,
    );
  });
}

export async function synthesizeMiniMaxSpeech({ agentId, text, outputPath }) {
  ensureFalClientConfigured();
  const customVoiceId = await getCustomVoiceId(agentId);
  let lastError = null;

  for (let attempt = 1; attempt <= MINIMAX_TTS_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.log(
        JSON.stringify({
          type: "minimax_tts_start",
          agentId,
          outputPath,
          textLength: text.length,
          attempt,
        }),
      );
      const result = await withTimeout(
        fal.subscribe("fal-ai/minimax/speech-02-hd", {
          input: {
            text,
            output_format: "url",
            language_boost: "English",
            voice_setting: {
              voice_id: customVoiceId,
              speed: 1,
              vol: 1,
              emotion: "neutral",
              english_normalization: true,
            },
            audio_setting: {
              format: "mp3",
              sample_rate: 32000,
              bitrate: 128000,
              channel: 1,
            },
          },
        }),
        MINIMAX_TTS_TIMEOUT_MS,
        `MiniMax TTS for ${agentId}`,
      );
      const audioUrl = result.data?.audio?.url;

      if (!audioUrl) {
        throw new Error(`MiniMax TTS did not return an audio URL for ${agentId}`);
      }

      console.log(
        JSON.stringify({
          type: "minimax_tts_done",
          agentId,
          audioUrl,
          attempt,
        }),
      );

      const response = await fetch(audioUrl, {
        signal: AbortSignal.timeout(MINIMAX_AUDIO_DOWNLOAD_TIMEOUT_MS),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Downloading MiniMax audio failed with HTTP ${response.status}: ${
            details || "unknown error"
          }`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

      console.log(
        JSON.stringify({
          type: "minimax_tts_download_done",
          agentId,
          outputPath,
          attempt,
        }),
      );

      return {
        audioUrl,
        customVoiceId,
      };
    } catch (error) {
      lastError = error;
      console.warn(
        JSON.stringify({
          type: "minimax_tts_retry",
          agentId,
          outputPath,
          attempt,
          message: error instanceof Error ? error.message : String(error),
        }),
      );

      if (attempt < MINIMAX_TTS_MAX_ATTEMPTS) {
        await sleep(attempt * 3000);
      }
    }
  }

  throw new Error(
    `MiniMax TTS failed for ${agentId} after ${MINIMAX_TTS_MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`,
  );
}

export async function prepareMiniMaxAssets() {
  ensureFalClientConfigured();
  await Promise.all([warmTrainingAudioUploads(), getMusicDirectory()]);
}

export function startMiniMaxAssetWarmup() {
  if (!process.env.FAL_KEY?.trim()) {
    console.warn(
      "[minimax_voice_registry] Skipping startup warmup because FAL_KEY is not set.",
    );
    return Promise.resolve();
  }

  startupWarmupPromise ??= prepareMiniMaxAssets().catch((error) => {
    startupWarmupPromise = null;
    console.error(
      "[minimax_voice_registry] Startup warmup failed:",
      error instanceof Error ? error.message : error,
    );
    throw error;
  });

  return startupWarmupPromise;
}
