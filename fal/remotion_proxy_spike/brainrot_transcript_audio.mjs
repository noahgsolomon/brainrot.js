import fs from "node:fs/promises";
import path from "node:path";

import {
  prepareMiniMaxAssets,
  resolveBundledMusicPath,
  synthesizeMiniMaxSpeech,
} from "./minimax_voice_registry.mjs";
import { runPythonSrtPipeline } from "./python_srt_pipeline.mjs";

const FAL_OPENROUTER_API_URL = "https://fal.run/openrouter/router";
const DEFAULT_TRANSCRIPT_MODEL = "x-ai/grok-4.20-beta";
const FALLBACK_TRANSCRIPT_MODELS = [
  "qwen/qwen3.5-35b-a3b",
  "google/gemini-3.1-flash-image-preview",
  "minimax/minimax-m2.5",
  "z-ai/glm-5",
];
const DEFAULT_BACKGROUND_VIDEO = "/background/MINECRAFT-0.mp4";
const DEFAULT_MUSIC = "WII_SHOP_CHANNEL_TRAP";
const OPENROUTER_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.BRAINROT_OPENROUTER_TIMEOUT_MS ?? "45000",
  10,
);
const PRIMARY_MODEL_MAX_ATTEMPTS = 5;
const PRIMARY_MODEL_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];
const FALLBACK_MODEL_MAX_WAVES = 5;
const FALLBACK_MODEL_WAVE_DELAYS_MS = [1_000, 2_000, 4_000, 6_000];
const AUDIO_GENERATION_CONCURRENCY = Number.parseInt(
  process.env.BRAINROT_AUDIO_CONCURRENCY ?? "4",
  10,
);

/**
 * @param {string} jobId
 */
function sanitizeJobId(jobId) {
  return String(jobId || "job").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * @param {string} agentName
 */
function humanizeAgentName(agentName) {
  return agentName.replace(/_/g, " ");
}

/**
 * @param {Record<string, unknown>} props
 * @param {string} preferredKey
 * @param {string} fallbackKey
 */
function resolveAgentName(props, preferredKey, fallbackKey) {
  const value = props[preferredKey] ?? props[fallbackKey];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required prop: ${preferredKey}`);
  }

  return value.trim();
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, concurrency, mapper) {
  const normalizedConcurrency = Math.max(
    1,
    Math.min(
      Number.isFinite(concurrency) ? Math.floor(concurrency) : 1,
      items.length || 1,
    ),
  );
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: normalizedConcurrency }, () => worker()),
  );

  return results;
}

/**
 * @param {string} text
 */
function extractJsonString(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Transcript model returned an empty output string");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * @param {unknown} payload
 */
function parseTranscriptPayload(payload) {
  const candidatePayload =
    payload && typeof payload === "object"
      ? /** @type {{ transcript?: unknown }} */ (payload)
      : {};
  const transcript = candidatePayload.transcript;

  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error("Transcript model response did not include a transcript array");
  }

  return transcript.map((entry, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.agentId !== "string" ||
      typeof entry.text !== "string"
    ) {
      throw new Error(`Invalid transcript entry at index ${index}`);
    }

    return {
      agentId: entry.agentId.trim(),
      text: entry.text.trim(),
    };
  });
}

/**
 * @param {{
 *   topic: string;
 *   agentA: string;
 *   agentB: string;
 *   model: string;
 * }} input
 */
async function generateBrainrotTranscript(input) {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    throw new Error("Missing required environment variable: FAL_KEY");
  }

  const agentAHuman = humanizeAgentName(input.agentA);
  const agentBHuman = humanizeAgentName(input.agentB);
  const systemPrompt = `Create a dialogue for a short-form conversation on the topic of ${
    input.topic
  }. The conversation should be between two agents, ${agentAHuman} and ${agentBHuman}, who should act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. ${agentAHuman} and ${agentBHuman} should both be absurdly vulgar and crude in their language, cursing excessively and making outrageous statements to the point where it becomes almost comically over-the-top. The dialogue should still provide insights into ${
    input.topic
  } but do so in the most profane and shocking way possible. Limit the dialogue to a maximum of 7 exchanges, aiming for a concise transcript that would last for about 1 minute. The agentId attribute must be either ${
    input.agentA
  } or ${
    input.agentB
  }. Return valid JSON only with this exact shape: {"transcript":[{"agentId":"${
    input.agentA
  }","text":"line here"}]}. Do not include markdown fences or any explanation outside the JSON.`;
  const prompt = `Generate a video transcript about ${input.topic}. Both agents should talk about it in the way they would, but exaggerate their qualities and make the conversation risque, edgy, and interesting to watch.`;

  const response = await fetch(FAL_OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    signal: AbortSignal.timeout(OPENROUTER_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      prompt,
      system_prompt: systemPrompt,
      model: input.model,
      temperature: 1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `fal OpenRouter returned HTTP ${response.status}: ${
        details || "unknown error"
      }`,
    );
  }

  const data = await response.json();
  const content = data?.output;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("fal OpenRouter returned an empty transcript payload");
  }

  return parseTranscriptPayload(JSON.parse(extractJsonString(content)));
}

/**
 * @param {{
 *   topic: string;
 *   agentA: string;
 *   agentB: string;
 *   model: string;
 *   useMockServices: boolean;
 * }} input
 */
async function getTranscriptWithRetry(input) {
  if (input.useMockServices) {
    return [
      {
        agentId: input.agentA,
        text: `I cannot believe we're actually doing a fal proof of concept about ${input.topic}.`,
      },
      {
        agentId: input.agentB,
        text: `This is the first real brainrot worker phase, and it already looks more serious than the old poller.`,
      },
      {
        agentId: input.agentA,
        text: `Good, because the next step is subtitles and then the real Remotion render.`,
      },
    ];
  }

  const fallbackModels = FALLBACK_TRANSCRIPT_MODELS.filter(
    (model, index, models) =>
      model !== input.model && models.indexOf(model) === index,
  );
  let lastError = null;

  for (let attempt = 1; attempt <= PRIMARY_MODEL_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.log(
        `[transcript] Trying primary model ${input.model} (attempt ${attempt}/${PRIMARY_MODEL_MAX_ATTEMPTS})`,
      );
      return await generateBrainrotTranscript({ ...input, model: input.model });
    } catch (error) {
      lastError = error;
      console.error(
        `[transcript] Primary model ${input.model} attempt ${attempt}/${PRIMARY_MODEL_MAX_ATTEMPTS} failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );

      const retryDelay = PRIMARY_MODEL_RETRY_DELAYS_MS[attempt - 1];
      if (retryDelay) {
        await sleep(retryDelay);
      }
    }
  }

  console.error(
    `[transcript] Primary model ${input.model} exhausted ${PRIMARY_MODEL_MAX_ATTEMPTS} attempts, switching to concurrent fallback waves...`,
  );

  for (let wave = 1; wave <= FALLBACK_MODEL_MAX_WAVES; wave += 1) {
    console.log(
      `[transcript] Starting fallback wave ${wave}/${FALLBACK_MODEL_MAX_WAVES} with models: ${fallbackModels.join(", ")}`,
    );

    try {
      const winner = await Promise.any(
        fallbackModels.map(async (model) => {
          try {
            const transcript = await generateBrainrotTranscript({ ...input, model });
            return { model, transcript };
          } catch (error) {
            console.error(
              `[transcript] Fallback model ${model} failed in wave ${wave}/${FALLBACK_MODEL_MAX_WAVES}: ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
            throw error;
          }
        }),
      );

      console.log(
        `[transcript] Fallback model ${winner.model} succeeded in wave ${wave}/${FALLBACK_MODEL_MAX_WAVES}`,
      );
      return winner.transcript;
    } catch (error) {
      const aggregateError =
        error instanceof AggregateError ? error : new AggregateError([error]);
      lastError = aggregateError.errors.at(-1) ?? error;
      console.error(
        `[transcript] Fallback wave ${wave}/${FALLBACK_MODEL_MAX_WAVES} fully failed`,
      );
    }

    const retryDelay = FALLBACK_MODEL_WAVE_DELAYS_MS[wave - 1];
    if (retryDelay) {
      await sleep(retryDelay);
    }
  }

  throw new Error(
    `Failed to generate valid transcript after trying primary model ${input.model} and fallback models (${fallbackModels.join(", ")}): ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`,
  );
}

/**
 * @param {{
 *   agentId: string;
 *   line: string;
 *   outputPath: string;
 *   useMockServices: boolean;
 * }} input
 */
async function generateVoiceClip(input) {
  if (input.useMockServices) {
    const placeholder = Buffer.from(
      `MOCK_AUDIO:${new Date().toISOString()}:${input.line}`,
      "utf8",
    );
    await fs.writeFile(input.outputPath, placeholder);
    return;
  }
  await synthesizeMiniMaxSpeech({
    agentId: input.agentId,
    text: input.line,
    outputPath: input.outputPath,
  });
}

/**
 * @param {{
 *   music: string;
 *   initialAgentName: string;
 *   audioFiles: Array<{ person: string; index: number; path: string }>;
 *   backgroundVideoFileName: string;
 * }} input
 */
function buildContextContent(input) {
  const musicValue =
    input.music === "NONE" ? `'NONE'` : `'/music/${input.music}.MP3'`;

  const subtitleEntries = input.audioFiles
    .map(
      (entry) => `{
    name: '${entry.person}',
    file: staticFile('srt/${entry.person}-${entry.index}.srt'),
  }`,
    )
    .join(",\n  ");

  return `import { staticFile } from 'remotion';

export const music: string = ${musicValue};
export const initialAgentName = '${input.initialAgentName}';
export const videoFileName = '${input.backgroundVideoFileName}';
export const videoMode = 'brainrot';

export const subtitlesFileName = [
  ${subtitleEntries}
];

export const rapper: string = 'SPONGEBOB';
export const imageBackground: string = '/rap/SPONGEBOB.png';
`;
}

/**
 * @param {{
 *   jobId: string;
 *   props: Record<string, unknown>;
 *   reportProgress: (status: string, progress: number, extra?: Record<string, unknown>) => Promise<void>;
 * }} input
 */
export async function runBrainrotTranscriptAudioJob(input) {
  const topic = String(input.props.topic ?? "").trim();

  if (!topic) {
    throw new Error("Missing required prop: topic");
  }

  const agentA = resolveAgentName(input.props, "agentA", "agent1");
  const agentB = resolveAgentName(input.props, "agentB", "agent2");
  const music =
    typeof input.props.music === "string" && input.props.music.trim().length > 0
      ? input.props.music.trim()
      : DEFAULT_MUSIC;
  const backgroundVideoFileName =
    typeof input.props.videoFileName === "string" &&
    input.props.videoFileName.trim().length > 0
      ? input.props.videoFileName.trim()
      : DEFAULT_BACKGROUND_VIDEO;
  const useMockServices = input.props.use_mock_services === true;
  const transcriptModel =
    typeof input.props.transcriptModel === "string" &&
    input.props.transcriptModel.trim().length > 0
      ? input.props.transcriptModel.trim()
      : process.env.BRAINROT_TRANSCRIPT_MODEL?.trim() ||
        process.env.FAL_OPENROUTER_MODEL?.trim() ||
        DEFAULT_TRANSCRIPT_MODEL;

  const safeJobId = sanitizeJobId(input.jobId);
  const workDir = path.join("/tmp", "brainrot", safeJobId);
  const voiceDir = path.join(workDir, "voice");
  const transcriptPath = path.join(workDir, "transcript.json");
  const manifestPath = path.join(workDir, "audio-manifest.json");
  const contextPath = path.join(workDir, "context.tsx");

  await fs.mkdir(voiceDir, { recursive: true });

  if (music !== "NONE") {
    await resolveBundledMusicPath(music);
  }

  await input.reportProgress("Generating transcript", 0, {
    phase: "brainrot_transcript_audio",
  });

  const transcript = await getTranscriptWithRetry({
    topic,
    agentA,
    agentB,
    model: transcriptModel,
    useMockServices,
  });

  await fs.writeFile(
    transcriptPath,
    JSON.stringify(
      {
        transcript,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (!useMockServices) {
    await input.reportProgress("Preparing MiniMax voice assets", 10, {
      phase: "brainrot_transcript_audio",
    });
    await prepareMiniMaxAssets();
  }

  await input.reportProgress("Generating audio", 12, {
    phase: "brainrot_transcript_audio",
    transcriptLineCount: transcript.length,
  });

  let completedAudioCount = 0;
  let audioProgressChain = Promise.resolve();
  const audioFiles = await mapWithConcurrency(
    transcript,
    AUDIO_GENERATION_CONCURRENCY,
    async (entry, index) => {
      if (!entry) {
        throw new Error(`Missing transcript entry at index ${index}`);
      }

      const outputPath = path.join(voiceDir, `${entry.agentId}-${index}.mp3`);

      await generateVoiceClip({
        agentId: entry.agentId,
        line: entry.text,
        outputPath,
        useMockServices,
      });

      completedAudioCount += 1;
      const currentCompletedCount = completedAudioCount;
      const progress =
        12 + Math.round((currentCompletedCount / transcript.length) * 6);
      audioProgressChain = audioProgressChain.then(() =>
        input.reportProgress(
          `Generating audio (${currentCompletedCount}/${transcript.length})`,
          progress,
          {
            phase: "brainrot_transcript_audio",
          },
        ),
      );
      await audioProgressChain;

      return {
        person: entry.agentId,
        index,
        path: outputPath,
        text: entry.text,
      };
    },
  );

  const subtitlePipelineResult = await runPythonSrtPipeline({
    workDir,
    audioFiles,
    reportProgress: input.reportProgress,
    useMockServices,
  });

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        jobId: input.jobId,
        topic,
        agentA,
        agentB,
        music,
        audioFiles,
        outputAudioPath: subtitlePipelineResult.outputAudioPath,
        srtFiles: subtitlePipelineResult.srtFiles,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    contextPath,
    buildContextContent({
      music,
      initialAgentName: audioFiles[0]?.person ?? agentA,
      audioFiles,
      backgroundVideoFileName,
    }),
    "utf8",
  );

  await input.reportProgress("Transcript and voice clips ready", 36, {
    phase: "brainrot_transcript_audio",
  });

  return {
    phase: "brainrot_transcript_audio",
    workDir,
    transcript,
    transcriptPath,
    contextPath,
    manifestPath,
    audioFiles,
    outputAudioPath: subtitlePipelineResult.outputAudioPath,
    srtFiles: subtitlePipelineResult.srtFiles,
    usedMockServices: useMockServices,
  };
}
