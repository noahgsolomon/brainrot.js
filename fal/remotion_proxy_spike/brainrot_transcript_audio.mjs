import fs from "node:fs/promises";
import path from "node:path";

import {
  prepareMiniMaxAssets,
  resolveBundledMusicPath,
  synthesizeMiniMaxSpeech,
} from "./minimax_voice_registry.mjs";
import { applyPitchModeToAudioFiles } from "./pitch_mode_audio.mjs";
import {
  runPythonAlignmentPipeline,
  runPythonSrtPipeline,
} from "./python_srt_pipeline.mjs";

const FAL_OPENROUTER_API_URL = "https://fal.run/openrouter/router";
const DEFAULT_TRANSCRIPT_MODEL = "x-ai/grok-4.20-beta";
const FALLBACK_OPENROUTER_MODELS = [
  "qwen/qwen3.5-35b-a3b",
  "google/gemini-3.1-flash-image-preview",
  "minimax/minimax-m2.5",
  "z-ai/glm-5",
];
const DEFAULT_BACKGROUND_VIDEO_FILE_NAMES = Array.from(
  { length: 11 },
  (_, index) => `MINECRAFT-${index + 1}.mp4`,
);
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
const SUPPORTED_DIALOGUE_EMOTIONS = [
  "neutral",
  "smug",
  "angry",
  "shocked",
  "confused",
  "laughing",
  "deadpan",
  "panic",
  "sad_defeated",
  "locked_in",
  "disgusted",
  "evil_grin",
];
const DEFAULT_DIALOGUE_EMOTION = "neutral";

function sanitizeJobId(jobId) {
  return String(jobId || "job").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function humanizeAgentName(agentName) {
  return agentName.replace(/_/g, " ");
}

function parseAgentListProp(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseAgentListProp(parsed);
    } catch {
      // Fall back to comma-separated parsing below.
    }
  }

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveAgentName(props, preferredKey, fallbackKey) {
  const value = props[preferredKey] ?? props[fallbackKey];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required prop: ${preferredKey}`);
  }

  return value.trim();
}

function resolveAgentNames(props) {
  const fromAgentsProp = [...new Set(parseAgentListProp(props.agents))];

  if (fromAgentsProp.length >= 2) {
    return fromAgentsProp;
  }

  return [
    resolveAgentName(props, "agentA", "agent1"),
    resolveAgentName(props, "agentB", "agent2"),
  ];
}

function parseBooleanProp(value) {
  return value === true || value === "true";
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listAvailableBackgroundVideoFileNames() {
  const candidateDirs = [
    path.join(process.cwd(), "generate", "public", "background"),
    "/app/generate/public/background",
  ];

  for (const candidateDir of candidateDirs) {
    if (!(await pathExists(candidateDir))) {
      continue;
    }

    const entries = await fs.readdir(candidateDir);
    const fileNames = entries
      .filter((entry) => /^MINECRAFT-\d+\.mp4$/i.test(entry))
      .sort((left, right) => {
        const leftNumber = Number.parseInt(left.match(/\d+/)?.[0] ?? "0", 10);
        const rightNumber = Number.parseInt(right.match(/\d+/)?.[0] ?? "0", 10);
        return leftNumber - rightNumber;
      });

    if (fileNames.length > 0) {
      return fileNames;
    }
  }

  return DEFAULT_BACKGROUND_VIDEO_FILE_NAMES;
}

async function resolveBackgroundVideoFileName(requestedVideoFileName) {
  const availableFileNames = await listAvailableBackgroundVideoFileNames();
  const normalizedRequestedBaseName =
    typeof requestedVideoFileName === "string" &&
    requestedVideoFileName.trim().length > 0
      ? path.basename(requestedVideoFileName.trim())
      : null;

  if (
    normalizedRequestedBaseName &&
    availableFileNames.includes(normalizedRequestedBaseName)
  ) {
    return `/background/${normalizedRequestedBaseName}`;
  }

  if (normalizedRequestedBaseName) {
    console.warn(
      `[background] Requested background ${normalizedRequestedBaseName} is unavailable, falling back to an existing bundled video.`,
    );
  }

  const selectedIndex = Math.floor(Math.random() * availableFileNames.length);
  const selectedFileName =
    availableFileNames[selectedIndex] ?? DEFAULT_BACKGROUND_VIDEO_FILE_NAMES[0];
  return `/background/${selectedFileName}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

      const item = items[currentIndex];
      results[currentIndex] = await mapper(item, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: normalizedConcurrency }, () => worker()),
  );

  return results;
}

function extractJsonString(text, taskName) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(`${taskName} returned an empty output string`);
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

function splitTranscriptWords(text) {
  return String(text)
    .split(/\s+/)
    .filter((word) => word.trim().length > 0);
}

function sanitizePlaintextDialogueText(text) {
  let sanitized = String(text ?? "");

  sanitized = sanitized.replace(/\r?\n+/g, " ");
  sanitized = sanitized.replace(/```+/g, " ");
  sanitized = sanitized.replace(/[*_`~]+/g, "");
  sanitized = sanitized.replace(/[<>{}\[\]]+/g, "");
  sanitized = sanitized.replace(/^\s*[-•]+\s*/g, "");
  sanitized = sanitized.replace(/^["']+|["']+$/g, "");
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

function normalizeSearchToken(token) {
  return String(token)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function tokensMatch(lineToken, phraseToken) {
  if (lineToken === phraseToken) {
    return true;
  }

  if (lineToken.length < 3 || phraseToken.length < 3) {
    return false;
  }

  return lineToken.startsWith(phraseToken) || phraseToken.startsWith(lineToken);
}

function parseTranscriptPayload(payload, allowedAgentIds = []) {
  const candidatePayload =
    payload && typeof payload === "object" ? payload : {};
  const transcript = candidatePayload.transcript;
  const allowedAgentIdSet = new Set(allowedAgentIds);

  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error(
      "Transcript model response did not include a transcript array",
    );
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

    const sanitizedText = sanitizePlaintextDialogueText(entry.text);
    if (!sanitizedText) {
      throw new Error(`Transcript entry at index ${index} has empty text`);
    }

    const agentId = entry.agentId.trim();

    if (allowedAgentIdSet.size > 0 && !allowedAgentIdSet.has(agentId)) {
      throw new Error(
        `Transcript entry at index ${index} used unsupported agentId ${agentId}`,
      );
    }

    return {
      agentId,
      text: sanitizedText,
    };
  });
}

function parsePitchSlowMomentsPayload(payload) {
  const candidatePayload =
    payload && typeof payload === "object" ? payload : {};
  const rawSlowMoments = Array.isArray(candidatePayload.slowMoments)
    ? candidatePayload.slowMoments
    : [];

  return rawSlowMoments.slice(0, 7).map((moment, index) => {
    if (
      !moment ||
      typeof moment !== "object" ||
      !Number.isInteger(moment.entryIndex) ||
      typeof moment.phrase !== "string"
    ) {
      throw new Error(`Invalid pitch-mode moment at index ${index}`);
    }

    const sanitizedPhrase = sanitizePlaintextDialogueText(moment.phrase);
    if (!sanitizedPhrase) {
      throw new Error(`Invalid pitch-mode moment phrase at index ${index}`);
    }

    return {
      entryIndex: moment.entryIndex,
      agentId:
        typeof moment.agentId === "string" && moment.agentId.trim().length > 0
          ? moment.agentId.trim()
          : null,
      phrase: sanitizedPhrase,
      reason:
        typeof moment.reason === "string" && moment.reason.trim().length > 0
          ? moment.reason.trim()
          : null,
    };
  });
}

function parseDialogueEmotionsPayload(payload, { transcript, allowedAgentIds }) {
  const candidatePayload =
    payload && typeof payload === "object" ? payload : {};
  const rawDialogueEmotions = Array.isArray(candidatePayload.dialogueEmotions)
    ? candidatePayload.dialogueEmotions
    : [];
  const allowedAgentIdSet = new Set(allowedAgentIds);
  const supportedEmotionSet = new Set(SUPPORTED_DIALOGUE_EMOTIONS);
  const emotionsByEntryIndex = new Map();

  if (rawDialogueEmotions.length === 0) {
    throw new Error(
      "Dialogue emotion model response did not include a dialogueEmotions array",
    );
  }

  for (const [index, selection] of rawDialogueEmotions.entries()) {
    if (
      !selection ||
      typeof selection !== "object" ||
      !Number.isInteger(selection.entryIndex) ||
      typeof selection.agentId !== "string" ||
      typeof selection.emotion !== "string"
    ) {
      throw new Error(`Invalid dialogue emotion entry at index ${index}`);
    }

    const transcriptEntry = transcript[selection.entryIndex];
    if (!transcriptEntry) {
      throw new Error(
        `Dialogue emotion entry ${index} referenced invalid transcript entryIndex ${selection.entryIndex}`,
      );
    }

    const agentId = selection.agentId.trim();
    const emotion = selection.emotion.trim();

    if (allowedAgentIdSet.size > 0 && !allowedAgentIdSet.has(agentId)) {
      throw new Error(
        `Dialogue emotion entry ${index} used unsupported agentId ${agentId}`,
      );
    }

    if (transcriptEntry.agentId !== agentId) {
      throw new Error(
        `Dialogue emotion entry ${index} used agentId ${agentId}, but transcript entry ${selection.entryIndex} belongs to ${transcriptEntry.agentId}`,
      );
    }

    if (!supportedEmotionSet.has(emotion)) {
      throw new Error(
        `Dialogue emotion entry ${index} used unsupported emotion ${emotion}`,
      );
    }

    if (emotionsByEntryIndex.has(selection.entryIndex)) {
      throw new Error(
        `Dialogue emotion response contained duplicate entryIndex ${selection.entryIndex}`,
      );
    }

    emotionsByEntryIndex.set(selection.entryIndex, {
      entryIndex: selection.entryIndex,
      agentId,
      emotion,
      reason:
        typeof selection.reason === "string" && selection.reason.trim().length > 0
          ? selection.reason.trim()
          : null,
    });
  }

  const missingEntries = transcript
    .map((_, entryIndex) => entryIndex)
    .filter((entryIndex) => !emotionsByEntryIndex.has(entryIndex));

  if (missingEntries.length > 0) {
    throw new Error(
      `Dialogue emotion response missed transcript entries: ${missingEntries.join(
        ", ",
      )}`,
    );
  }

  const normalizedSelections = transcript.map((entry, entryIndex) => {
    const selection = emotionsByEntryIndex.get(entryIndex);
    return {
      entryIndex,
      agentId: entry.agentId,
      emotion: selection?.emotion ?? DEFAULT_DIALOGUE_EMOTION,
      reason: selection?.reason ?? null,
    };
  });

  assertDialogueEmotionVariety(normalizedSelections, transcript);

  return normalizedSelections;
}

function getMinimumUniqueEmotionCountForLineCount(lineCount) {
  if (lineCount >= 3) {
    return 3;
  }

  return Math.max(1, lineCount);
}

function buildDialogueEmotionSpeakerTargets(transcript) {
  const turnsByAgentId = new Map();

  for (const entry of transcript) {
    if (!entry?.agentId) {
      continue;
    }

    turnsByAgentId.set(entry.agentId, (turnsByAgentId.get(entry.agentId) ?? 0) + 1);
  }

  return Array.from(turnsByAgentId.entries())
    .sort(([leftAgentId], [rightAgentId]) => leftAgentId.localeCompare(rightAgentId))
    .map(([agentId, lineCount]) => ({
      agentId,
      lineCount,
      minimumUniqueEmotions:
        getMinimumUniqueEmotionCountForLineCount(lineCount),
    }));
}

function assertDialogueEmotionVariety(dialogueEmotions, transcript) {
  const targets = buildDialogueEmotionSpeakerTargets(transcript);

  for (const target of targets) {
    if (target.minimumUniqueEmotions <= 1) {
      continue;
    }

    const selectedEmotions = new Set(
      dialogueEmotions
        .filter((selection) => selection.agentId === target.agentId)
        .map((selection) => selection.emotion),
    );

    if (selectedEmotions.size < target.minimumUniqueEmotions) {
      throw new Error(
        `Dialogue emotion response used only ${selectedEmotions.size} unique emotions for ${target.agentId} across ${target.lineCount} lines; expected at least ${target.minimumUniqueEmotions}`,
      );
    }
  }
}

async function callFalOpenRouter({
  taskName,
  prompt,
  systemPrompt,
  model,
  parseOutput,
}) {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    throw new Error("Missing required environment variable: FAL_KEY");
  }

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
      model,
      temperature: 1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `${taskName} request returned HTTP ${response.status}: ${
        details || "unknown error"
      }`,
    );
  }

  const data = await response.json();
  const content = data?.output;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(`${taskName} returned an empty payload`);
  }

  return parseOutput(JSON.parse(extractJsonString(content, taskName)));
}

async function runStructuredOpenRouterTaskWithRetry({
  taskName,
  primaryModel,
  prompt,
  systemPrompt,
  parseOutput,
}) {
  const fallbackModels = FALLBACK_OPENROUTER_MODELS.filter(
    (model, index, models) =>
      model !== primaryModel && models.indexOf(model) === index,
  );
  let lastError = null;

  for (let attempt = 1; attempt <= PRIMARY_MODEL_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.log(
        `[${taskName}] Trying primary model ${primaryModel} (attempt ${attempt}/${PRIMARY_MODEL_MAX_ATTEMPTS})`,
      );
      return await callFalOpenRouter({
        taskName,
        prompt,
        systemPrompt,
        model: primaryModel,
        parseOutput,
      });
    } catch (error) {
      lastError = error;
      console.error(
        `[${taskName}] Primary model ${primaryModel} attempt ${attempt}/${PRIMARY_MODEL_MAX_ATTEMPTS} failed: ${
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
    `[${taskName}] Primary model ${primaryModel} exhausted ${PRIMARY_MODEL_MAX_ATTEMPTS} attempts, switching to concurrent fallback waves...`,
  );

  for (let wave = 1; wave <= FALLBACK_MODEL_MAX_WAVES; wave += 1) {
    console.log(
      `[${taskName}] Starting fallback wave ${wave}/${FALLBACK_MODEL_MAX_WAVES} with models: ${fallbackModels.join(
        ", ",
      )}`,
    );

    try {
      const winner = await Promise.any(
        fallbackModels.map(async (model) => {
          try {
            const result = await callFalOpenRouter({
              taskName,
              prompt,
              systemPrompt,
              model,
              parseOutput,
            });
            return { model, result };
          } catch (error) {
            console.error(
              `[${taskName}] Fallback model ${model} failed in wave ${wave}/${FALLBACK_MODEL_MAX_WAVES}: ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
            throw error;
          }
        }),
      );

      console.log(
        `[${taskName}] Fallback model ${winner.model} succeeded in wave ${wave}/${FALLBACK_MODEL_MAX_WAVES}`,
      );
      return winner.result;
    } catch (error) {
      const aggregateError =
        error instanceof AggregateError ? error : new AggregateError([error]);
      lastError = aggregateError.errors.at(-1) ?? error;
      console.error(
        `[${taskName}] Fallback wave ${wave}/${FALLBACK_MODEL_MAX_WAVES} fully failed`,
      );
    }

    const retryDelay = FALLBACK_MODEL_WAVE_DELAYS_MS[wave - 1];
    if (retryDelay) {
      await sleep(retryDelay);
    }
  }

  throw new Error(
    `Failed to complete ${taskName} after trying primary model ${primaryModel} and fallback models (${fallbackModels.join(
      ", ",
    )}): ${lastError instanceof Error ? lastError.message : "unknown error"}`,
  );
}

function formatAgentList(agentIds) {
  const humanized = agentIds.map(humanizeAgentName);

  if (humanized.length <= 1) {
    return humanized[0] ?? "";
  }

  if (humanized.length === 2) {
    return `${humanized[0]} and ${humanized[1]}`;
  }

  return `${humanized.slice(0, -1).join(", ")}, and ${humanized.at(-1)}`;
}

function getMinimumExchangeCount(agentIds) {
  return Math.max(5, agentIds.length * 2);
}

function buildMockTranscript({ topic, agents }) {
  const safeAgents = agents.slice(0, Math.min(agents.length, 8));
  const exchangeCount = getMinimumExchangeCount(safeAgents);

  return Array.from({ length: exchangeCount }, (_, index) => {
    const agentId = safeAgents[index % safeAgents.length];
    const humanName = humanizeAgentName(agentId);

    return {
      agentId,
      text:
        index === 0
          ? `I cannot believe we're actually doing a fal proof of concept about ${topic}.`
          : index === exchangeCount - 1
            ? `Good, because now ${humanName} gets another turn and the render finally feels like an actual crowd argument.`
            : `${humanName} is still piling onto this ${topic} debate because a bigger cast needs more than seven tiny exchanges to get properly chaotic.`,
    };
  });
}

async function getTranscriptWithRetry({
  topic,
  agents,
  model,
  useMockServices,
}) {
  if (useMockServices) {
    return buildMockTranscript({
      topic,
      agents,
    });
  }

  const minimumExchanges = getMinimumExchangeCount(agents);
  const agentList = formatAgentList(agents);
  const systemPrompt = `Create a dialogue for a conversation on the topic of ${topic}. The conversation should include these agents: ${agentList}. Every selected agent should speak at least once. Use a minimum of ${minimumExchanges} exchanges, and when there are many selected agents, let the conversation run longer so multiple speakers get multiple turns instead of rushing to the finish. There is no hard maximum exchange count. They should all act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. The dialogue should still provide insights into ${topic} but do so in the most profane, shocking, and funny way possible. The agentId attribute must always be one of: ${agents.join(", ")}. Return valid JSON only with this exact shape: {"transcript":[{"agentId":"${agents[0]}","text":"line here"}]}. Every text field must be plain spoken dialogue only. Never include markdown, bullet points, emphasis markers, asterisks, brackets, stage directions, action cues, quoted wrappers, emojis, speaker labels inside the text, or any meta commentary. Do not use *, **, _, ~, \`, [, ], {, }, <, > anywhere in any transcript text. The text must look like literal words that should be spoken aloud by TTS. Do not include markdown fences or any explanation outside the JSON.`;
  const prompt = `Generate a video transcript about ${topic}. Every selected agent should get a distinct turn, and if the cast is large the conversation should stretch out into a much bigger chaotic back-and-forth instead of stopping after a tiny number of exchanges.`;

  return runStructuredOpenRouterTaskWithRetry({
    taskName: "transcript",
    primaryModel: model,
    prompt,
    systemPrompt,
    parseOutput: (payload) => {
      const transcript = parseTranscriptPayload(payload, agents);
      const presentAgentIds = new Set(transcript.map((entry) => entry.agentId));
      const missingAgents = agents.filter((agentId) => !presentAgentIds.has(agentId));

      if (missingAgents.length > 0) {
        throw new Error(
          `Transcript did not give every selected agent a turn. Missing: ${missingAgents.join(
            ", ",
          )}`,
        );
      }

      return transcript;
    },
  });
}

function inferDialogueEmotionFromText(text) {
  const normalizedText = String(text ?? "").toLowerCase();

  if (
    /\b(ha|haha|lmao|lmfao|rofl|laugh|hilarious)\b/.test(normalizedText)
  ) {
    return "laughing";
  }

  if (
    /\b(gross|disgusting|vile|revolting|nasty|ew|eww)\b/.test(normalizedText)
  ) {
    return "disgusted";
  }

  if (
    /\b(oh no|we are cooked|we're cooked|i'm cooked|im cooked|panic|doomed|help)\b/.test(
      normalizedText,
    )
  ) {
    return "panic";
  }

  if (
    /\b(checkmate|i won|i just won|cooked you|owned you|obviously|clearly)\b/.test(
      normalizedText,
    )
  ) {
    return "smug";
  }

  if (
    /\b(wait|what|no way|are you serious|i can't believe|i cant believe|unbelievable)\b/.test(
      normalizedText,
    )
  ) {
    return "shocked";
  }

  if (
    /\b(huh|confused|what are you talking about|that makes no sense|doesn't make sense|doesnt make sense)\b/.test(
      normalizedText,
    ) || normalizedText.includes("?")
  ) {
    return "confused";
  }

  if (
    /\b(focus|listen|pay attention|let me explain|stay with me)\b/.test(
      normalizedText,
    )
  ) {
    return "locked_in";
  }

  if (
    /\b(over|i lost|we lost|finished|done for|can't do this|cant do this)\b/.test(
      normalizedText,
    )
  ) {
    return "sad_defeated";
  }

  if (
    /\b(perfect|excellent|exactly what i wanted|hehe|mwahaha|evil)\b/.test(
      normalizedText,
    )
  ) {
    return "evil_grin";
  }

  if (
    normalizedText.includes("!") ||
    /\b(shut up|idiot|moron|liar|insane|crazy)\b/.test(normalizedText)
  ) {
    return "angry";
  }

  if (normalizedText.split(/\s+/).filter(Boolean).length <= 4) {
    return "deadpan";
  }

  return DEFAULT_DIALOGUE_EMOTION;
}

function buildFallbackDialogueEmotions(transcript) {
  return transcript.map((entry, entryIndex) => ({
    entryIndex,
    agentId: entry.agentId,
    emotion: inferDialogueEmotionFromText(entry.text),
    reason: "fallback heuristic",
  }));
}

async function getDialogueEmotionsWithRetry({
  transcript,
  agents,
  model,
  useMockServices,
}) {
  if (useMockServices) {
    return buildFallbackDialogueEmotions(transcript);
  }

  const transcriptForPrompt = transcript.map((entry, entryIndex) => ({
    entryIndex,
    agentId: entry.agentId,
    text: entry.text,
  }));
  const speakerTargets = buildDialogueEmotionSpeakerTargets(transcript);
  const supportedEmotionList = SUPPORTED_DIALOGUE_EMOTIONS.join(", ");
  const systemPrompt = `You are assigning a single sprite emotion label to every dialogue turn in a chaotic short-form video conversation. For every transcript entry, choose exactly one emotion from this fixed list and do not invent any new labels: ${supportedEmotionList}. Pick the emotion for how the speaking character should visually look while delivering that line, not how the listeners feel. Across the full transcript, each speaker should feel expressive and dynamic rather than locked into one default face. For any speaker with 3 or more lines, use at least 3 distinct emotions across their lines unless the transcript truly makes that impossible. Avoid flattening an entire speaker into one repeated expression like all neutral, all smug, or all angry. Let the emotions evolve with the joke beats, rebuttals, panic moments, punchlines, and recoveries. You must return exactly one emotion label for every transcript entry. Return valid JSON only with this exact shape: {"dialogueEmotions":[{"entryIndex":0,"agentId":"${agents[0]}","emotion":"neutral","reason":"brief why"}]}. Preserve the original entryIndex values and agentId values exactly.`;
  const prompt = `Assign one sprite emotion to every transcript entry.

Speaker variety targets:
${JSON.stringify(speakerTargets, null, 2)}

The best answers use expressive variety for each speaker while still fitting the line itself. Do not keep a speaker in the same emotion for the whole conversation unless it is absolutely unavoidable.

Transcript:
${JSON.stringify(
    transcriptForPrompt,
    null,
    2,
  )}`;

  return runStructuredOpenRouterTaskWithRetry({
    taskName: "dialogue_emotions",
    primaryModel: model,
    prompt,
    systemPrompt,
    parseOutput: (payload) =>
      parseDialogueEmotionsPayload(payload, {
        transcript,
        allowedAgentIds: agents,
      }),
  });
}

function buildFallbackPitchSlowMomentSelections(transcript) {
  return transcript
    .slice(0, Math.min(transcript.length, 5))
    .map((entry, entryIndex) => {
      const words = splitTranscriptWords(entry.text);
      const phraseWords = words.slice(Math.max(0, words.length - 4));

      if (phraseWords.length === 0) {
        return null;
      }

      return {
        entryIndex,
        agentId: entry.agentId,
        phrase: phraseWords.join(" "),
        reason: "fallback punchline",
      };
    })
    .filter(Boolean);
}

async function getPitchSlowMomentsWithRetry({
  transcript,
  model,
  useMockServices,
}) {
  if (useMockServices) {
    return buildFallbackPitchSlowMomentSelections(transcript);
  }

  const transcriptForPrompt = transcript.map((entry, entryIndex) => ({
    entryIndex,
    agentId: entry.agentId,
    text: entry.text,
  }));
  const systemPrompt = `You are selecting a few short "pitch drop" meme moments for an aggressively edited short-form video. The default voice treatment is sped-up and higher-pitched. Your job is to identify the handful of moments that should dramatically switch to slowed-down, lower-pitched delivery. Choose the funniest, most shocking, most damning, most risqué, or most absurd punchline phrases. Pick between 3 and 7 moments when the transcript supports it. Each phrase must be copied exactly from one transcript line as a short contiguous phrase, ideally 1 to 8 words. Spread the moments across the conversation when possible. Do not choose overlapping phrases from the same line. Avoid selecting a whole line unless the line is already very short. Return valid JSON only with this exact shape: {"slowMoments":[{"entryIndex":0,"agentId":"JOE_ROGAN","phrase":"exact words here","reason":"brief why"}]}.`;
  const prompt = `Select the slowdown phrases for this transcript:\n${JSON.stringify(
    transcriptForPrompt,
    null,
    2,
  )}`;

  return runStructuredOpenRouterTaskWithRetry({
    taskName: "pitch_mode",
    primaryModel: model,
    prompt,
    systemPrompt,
    parseOutput: parsePitchSlowMomentsPayload,
  });
}

function findPhraseWordRange(lineWords, phraseWords) {
  const normalizedLineWords = lineWords.map(normalizeSearchToken);
  const normalizedPhraseWords = phraseWords
    .map(normalizeSearchToken)
    .filter((token) => token.length > 0);

  if (normalizedPhraseWords.length === 0) {
    return null;
  }

  for (
    let phraseLength = normalizedPhraseWords.length;
    phraseLength >= 1;
    phraseLength -= 1
  ) {
    for (
      let phraseStart = 0;
      phraseStart + phraseLength <= normalizedPhraseWords.length;
      phraseStart += 1
    ) {
      const candidatePhraseWords = normalizedPhraseWords.slice(
        phraseStart,
        phraseStart + phraseLength,
      );

      for (
        let lineStart = 0;
        lineStart + candidatePhraseWords.length <= normalizedLineWords.length;
        lineStart += 1
      ) {
        const matches = candidatePhraseWords.every((candidateWord, offset) =>
          tokensMatch(normalizedLineWords[lineStart + offset], candidateWord),
        );

        if (!matches) {
          continue;
        }

        return {
          startWordIndexInclusive: lineStart,
          endWordIndexInclusive: lineStart + candidatePhraseWords.length - 1,
          matchedPhrase: lineWords
            .slice(lineStart, lineStart + candidatePhraseWords.length)
            .join(" "),
        };
      }
    }
  }

  return null;
}

function resolvePitchSlowMoments({ transcript, selections }) {
  const resolvedMoments = [];
  const usedKeys = new Set();

  for (const selection of selections) {
    const entry = transcript[selection.entryIndex];
    if (!entry) {
      continue;
    }

    const lineWords = splitTranscriptWords(entry.text);
    const phraseWords = splitTranscriptWords(selection.phrase);
    const wordRange = findPhraseWordRange(lineWords, phraseWords);

    if (!wordRange) {
      continue;
    }

    const key = `${selection.entryIndex}:${wordRange.startWordIndexInclusive}:${wordRange.endWordIndexInclusive}`;
    if (usedKeys.has(key)) {
      continue;
    }

    usedKeys.add(key);
    resolvedMoments.push({
      entryIndex: selection.entryIndex,
      agentId: entry.agentId,
      phrase: wordRange.matchedPhrase,
      reason: selection.reason,
      startWordIndexInclusive: wordRange.startWordIndexInclusive,
      endWordIndexInclusive: wordRange.endWordIndexInclusive,
    });
  }

  return resolvedMoments.sort(
    (left, right) =>
      left.entryIndex - right.entryIndex ||
      left.startWordIndexInclusive - right.startWordIndexInclusive,
  );
}

async function generateVoiceClip({
  agentId,
  line,
  outputPath,
  useMockServices,
}) {
  if (useMockServices) {
    const placeholder = Buffer.from(
      `MOCK_AUDIO:${new Date().toISOString()}:${line}`,
      "utf8",
    );
    await fs.writeFile(outputPath, placeholder);
    return;
  }

  await synthesizeMiniMaxSpeech({
    agentId,
    text: line,
    outputPath,
  });
}

function buildContextContent({
  music,
  initialAgentName,
  speakerOrder,
  dialogueEmotions,
  slowModeIntervals,
  subtitleFiles,
  backgroundVideoFileName,
}) {
  const musicValue = music === "NONE" ? `'NONE'` : `'/music/${music}.MP3'`;
  const speakerOrderValue = JSON.stringify(speakerOrder);
  const dialogueEmotionsValue = JSON.stringify(dialogueEmotions);
  const slowModeIntervalsValue = JSON.stringify(slowModeIntervals);

  const subtitleEntries = subtitleFiles
    .map(
      (entry) => `{
    name: '${entry.person}',
    file: staticFile('srt/${entry.fileName ?? `${entry.person}-${entry.index}.srt`}'),
  }`,
    )
    .join(",\n  ");

  return `import { staticFile } from 'remotion';

export const music: string = ${musicValue};
export const initialAgentName = '${initialAgentName}';
export const videoFileName = '${backgroundVideoFileName}';
export const videoMode = 'brainrot';
export const speakerOrder = ${speakerOrderValue};
export const dialogueEmotions = ${dialogueEmotionsValue};
export const slowModeIntervals = ${slowModeIntervalsValue};

export const subtitlesFileName = [
  ${subtitleEntries}
];

export const rapper: string = 'SPONGEBOB';
export const imageBackground: string = '/rap/SPONGEBOB.png';
`;
}

export async function runBrainrotTranscriptAudioJob(input) {
  const topic = String(input.props.topic ?? "").trim();

  if (!topic) {
    throw new Error("Missing required prop: topic");
  }

  const agents = resolveAgentNames(input.props);
  const music =
    typeof input.props.music === "string" && input.props.music.trim().length > 0
      ? input.props.music.trim()
      : DEFAULT_MUSIC;
  const requestedBackgroundVideoFileName =
    typeof input.props.videoFileName === "string" &&
    input.props.videoFileName.trim().length > 0
      ? input.props.videoFileName.trim()
      : null;
  const backgroundVideoFileName = await resolveBackgroundVideoFileName(
    requestedBackgroundVideoFileName,
  );
  const useMockServices = parseBooleanProp(input.props.use_mock_services);
  const pitchModeEnabled = parseBooleanProp(
    input.props.pitchMode ?? input.props.pitch_mode,
  );
  const pitchModeApplied = pitchModeEnabled && !useMockServices;
  const transcriptModel =
    typeof input.props.transcriptModel === "string" &&
    input.props.transcriptModel.trim().length > 0
      ? input.props.transcriptModel.trim()
      : process.env.BRAINROT_TRANSCRIPT_MODEL?.trim() ||
        process.env.FAL_OPENROUTER_MODEL?.trim() ||
        DEFAULT_TRANSCRIPT_MODEL;
  const pitchAnalysisModel =
    typeof input.props.pitchAnalysisModel === "string" &&
    input.props.pitchAnalysisModel.trim().length > 0
      ? input.props.pitchAnalysisModel.trim()
      : process.env.BRAINROT_PITCH_ANALYSIS_MODEL?.trim() || transcriptModel;
  const emotionAnalysisModel =
    typeof input.props.emotionAnalysisModel === "string" &&
    input.props.emotionAnalysisModel.trim().length > 0
      ? input.props.emotionAnalysisModel.trim()
      : process.env.BRAINROT_EMOTION_ANALYSIS_MODEL?.trim() || transcriptModel;

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

  await input.reportProgress("Preparing transcript request", 2, {
    phase: "brainrot_transcript_audio",
    phaseKey: "transcript_prepare",
  });

  await input.reportProgress("Generating transcript", 4, {
    phase: "brainrot_transcript_audio",
    phaseKey: "transcript_generation",
  });

  const transcript = await getTranscriptWithRetry({
    topic,
    agents,
    model: transcriptModel,
    useMockServices,
  });

  await input.reportProgress("Transcript ready", 8, {
    phase: "brainrot_transcript_audio",
    phaseKey: "transcript_ready",
    transcriptLineCount: transcript.length,
  });

  let pitchSlowMomentSelections = [];
  let resolvedPitchSlowMoments = [];
  let dialogueEmotions = buildFallbackDialogueEmotions(transcript);

  await input.reportProgress("Analyzing dialogue emotions", 9, {
    phase: "brainrot_transcript_audio",
    phaseKey: "dialogue_emotion_selection_start",
  });

  const dialogueEmotionPromise = getDialogueEmotionsWithRetry({
    transcript,
    agents,
    model: emotionAnalysisModel,
    useMockServices,
  });

  const pitchSlowMomentPromise = pitchModeEnabled
    ? (async () => {
        await input.reportProgress("Selecting pitch mode moments", 10, {
          phase: "brainrot_transcript_audio",
          phaseKey: "pitch_mode_selection_start",
        });

        return getPitchSlowMomentsWithRetry({
          transcript,
          model: pitchAnalysisModel,
          useMockServices,
        });
      })()
    : Promise.resolve([]);

  const [dialogueEmotionResult, pitchSlowMomentResult] = await Promise.allSettled(
    [dialogueEmotionPromise, pitchSlowMomentPromise],
  );

  if (dialogueEmotionResult.status === "fulfilled") {
    dialogueEmotions = dialogueEmotionResult.value;
  } else {
    console.error(
      `[dialogue_emotions] Falling back to heuristic selections after analysis failure: ${
        dialogueEmotionResult.reason instanceof Error
          ? dialogueEmotionResult.reason.message
          : "unknown error"
      }`,
    );
  }

  await input.reportProgress("Dialogue emotions ready", 10, {
    phase: "brainrot_transcript_audio",
    phaseKey: "dialogue_emotion_selection_complete",
    dialogueEmotionCount: dialogueEmotions.length,
  });

  if (pitchModeEnabled) {
    if (pitchSlowMomentResult.status === "fulfilled") {
      pitchSlowMomentSelections = pitchSlowMomentResult.value;
    } else {
      console.error(
        `[pitch_mode] Falling back to heuristic selections after analysis failure: ${
          pitchSlowMomentResult.reason instanceof Error
            ? pitchSlowMomentResult.reason.message
            : "unknown error"
        }`,
      );
      pitchSlowMomentSelections =
        buildFallbackPitchSlowMomentSelections(transcript);
    }

    resolvedPitchSlowMoments = resolvePitchSlowMoments({
      transcript,
      selections: pitchSlowMomentSelections,
    });

    if (resolvedPitchSlowMoments.length === 0) {
      pitchSlowMomentSelections =
        buildFallbackPitchSlowMomentSelections(transcript);
      resolvedPitchSlowMoments = resolvePitchSlowMoments({
        transcript,
        selections: pitchSlowMomentSelections,
      });
    }

    await input.reportProgress("Pitch mode moments ready", 11, {
      phase: "brainrot_transcript_audio",
      phaseKey: "pitch_mode_selection_complete",
      pitchModeApplied,
      slowMomentCount: resolvedPitchSlowMoments.length,
    });
  }

  const transcriptWithEmotions = transcript.map((entry, entryIndex) => ({
    ...entry,
    emotion:
      dialogueEmotions[entryIndex]?.emotion ?? DEFAULT_DIALOGUE_EMOTION,
  }));

  await fs.writeFile(
    transcriptPath,
    JSON.stringify(
      {
        transcript: transcriptWithEmotions,
        dialogueEmotions,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (!useMockServices) {
    await input.reportProgress("Preparing MiniMax voice assets", 12, {
      phase: "brainrot_transcript_audio",
      phaseKey: "voice_assets_prepare",
    });
    await prepareMiniMaxAssets();

    await input.reportProgress("MiniMax voice assets ready", 13, {
      phase: "brainrot_transcript_audio",
      phaseKey: "voice_assets_ready",
    });
  }

  await input.reportProgress("Generating audio", 14, {
    phase: "brainrot_transcript_audio",
    phaseKey: "audio_generation_start",
    transcriptLineCount: transcript.length,
  });

  let completedAudioCount = 0;
  let audioProgressChain = Promise.resolve();
  const generatedAudioFiles = await mapWithConcurrency(
    transcriptWithEmotions,
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
        14 + Math.round((currentCompletedCount / transcript.length) * 8);
      audioProgressChain = audioProgressChain.then(() =>
        input.reportProgress(
          `Generating audio (${currentCompletedCount}/${transcript.length})`,
          progress,
          {
            phase: "brainrot_transcript_audio",
            phaseKey: "audio_generation",
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

  let finalAudioFiles = generatedAudioFiles;
  let alignmentData = [];

  if (pitchModeApplied) {
    if (resolvedPitchSlowMoments.length > 0) {
      await input.reportProgress("Aligning audio for pitch mode", 24, {
        phase: "brainrot_transcript_audio",
        phaseKey: "pitch_mode_alignment_start",
        slowMomentCount: resolvedPitchSlowMoments.length,
      });

      const alignmentResult = await runPythonAlignmentPipeline({
        workDir,
        audioFiles: generatedAudioFiles,
        useMockServices,
      });
      alignmentData = alignmentResult.audioFiles ?? [];
    }

    await input.reportProgress("Applying pitch mode audio", 26, {
      phase: "brainrot_transcript_audio",
      phaseKey: "pitch_mode_audio_start",
      slowMomentCount: resolvedPitchSlowMoments.length,
    });

    const pitchModeAudioResult = await applyPitchModeToAudioFiles({
      workDir,
      audioFiles: generatedAudioFiles,
      alignmentData,
      resolvedSlowMoments: resolvedPitchSlowMoments,
    });
    finalAudioFiles = pitchModeAudioResult.audioFiles;

    await input.reportProgress("Pitch mode audio ready", 27, {
      phase: "brainrot_transcript_audio",
      phaseKey: "pitch_mode_audio_complete",
      slowMomentCount: resolvedPitchSlowMoments.length,
    });
  }

  const subtitlePipelineResult = await runPythonSrtPipeline({
    workDir,
    audioFiles: finalAudioFiles,
    reportProgress: input.reportProgress,
    useMockServices,
    startProgress: pitchModeApplied ? 28 : 24,
    completeProgress: 35,
  });
  const timelineEntries = Array.isArray(subtitlePipelineResult.timelineEntries)
    ? subtitlePipelineResult.timelineEntries
    : [];
  const slowModeIntervals = timelineEntries
    .filter((entry) => {
      const startSeconds = Number(entry?.startSeconds);
      const endSeconds = Number(entry?.endSeconds);
      return (
        entry?.pitchModeSegmentMode === "slow" &&
        Number.isFinite(startSeconds) &&
        Number.isFinite(endSeconds) &&
        endSeconds > startSeconds
      );
    })
    .map((entry) => ({
      agentName:
        typeof entry.person === "string" && entry.person.length > 0
          ? entry.person
          : null,
      startSeconds: Number(entry.startSeconds),
      endSeconds: Number(entry.endSeconds),
    }));

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        jobId: input.jobId,
        topic,
        agents,
        agentA: agents[0] ?? null,
        agentB: agents[1] ?? null,
        music,
        transcriptModel,
        pitchAnalysisModel,
        emotionAnalysisModel,
        pitchModeEnabled,
        pitchModeApplied,
        dialogueEmotions,
        pitchSlowMomentSelections,
        pitchSlowMoments: resolvedPitchSlowMoments,
        sourceAudioFiles: generatedAudioFiles,
        alignmentData,
        audioFiles: finalAudioFiles,
        outputAudioPath: subtitlePipelineResult.outputAudioPath,
        splitSrtFiles: subtitlePipelineResult.splitSrtFiles,
        srtFiles: subtitlePipelineResult.srtFiles,
        timelineEntries,
        slowModeIntervals,
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
      initialAgentName: finalAudioFiles[0]?.person ?? agents[0],
      speakerOrder: agents,
      dialogueEmotions,
      slowModeIntervals,
      subtitleFiles: subtitlePipelineResult.srtFiles,
      backgroundVideoFileName,
    }),
    "utf8",
  );

  await input.reportProgress("Transcript and voice clips ready", 38, {
    phase: "brainrot_transcript_audio",
    phaseKey: "brainrot_prep_complete",
  });

  return {
    phase: "brainrot_transcript_audio",
    workDir,
    transcript: transcriptWithEmotions,
    transcriptPath,
    contextPath,
    manifestPath,
    sourceAudioFiles: generatedAudioFiles,
    audioFiles: finalAudioFiles,
    outputAudioPath: subtitlePipelineResult.outputAudioPath,
    splitSrtFiles: subtitlePipelineResult.splitSrtFiles,
    srtFiles: subtitlePipelineResult.srtFiles,
    timelineEntries,
    dialogueEmotions,
    slowModeIntervals,
    pitchModeEnabled,
    pitchModeApplied,
    pitchSlowMoments: resolvedPitchSlowMoments,
    usedMockServices: useMockServices,
  };
}
