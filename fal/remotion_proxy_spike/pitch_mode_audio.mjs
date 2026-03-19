import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const FAST_PITCH_FACTOR = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_FAST_FACTOR ?? "1.12",
);
const SLOW_PITCH_FACTOR = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_SLOW_FACTOR ?? "0.84",
);
const MIN_INTERVAL_SECONDS = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_MIN_INTERVAL_SECONDS ?? "0.04",
);
const MIN_RENDER_DURATION_SECONDS = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_MIN_RENDER_DURATION_SECONDS ?? "0.08",
);
const PITCH_MODE_AUDIO_CONCURRENCY = Number.parseInt(
  process.env.BRAINROT_PITCH_MODE_AUDIO_CONCURRENCY ?? "2",
  10,
);
const DIALOGUE_GAP_SECONDS = Number.parseFloat(
  process.env.BRAINROT_DIALOGUE_GAP_SECONDS ?? "0.2",
);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toKey(person, index) {
  return `${person}:${index}`;
}

async function probeAudioFile(audioPath) {
  const { stdout } = await execFileP(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      audioPath,
    ],
    {
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  const payload = JSON.parse(stdout);
  const audioStream =
    payload.streams?.find((stream) => stream.codec_type === "audio") ??
    payload.streams?.[0] ??
    null;
  const sampleRate = Math.max(
    8_000,
    Number.parseInt(audioStream?.sample_rate ?? "", 10) || 32_000,
  );
  const durationSeconds =
    Number.parseFloat(audioStream?.duration ?? "") ||
    Number.parseFloat(payload.format?.duration ?? "") ||
    0;

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Unable to determine duration for ${audioPath}`);
  }

  return {
    sampleRate,
    durationSeconds,
  };
}

function mergeTimeRanges(ranges) {
  if (ranges.length === 0) {
    return [];
  }

  const sortedRanges = [...ranges].sort((left, right) => left.start - right.start);
  const mergedRanges = [sortedRanges[0]];

  for (const range of sortedRanges.slice(1)) {
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (range.start <= previousRange.end + MIN_INTERVAL_SECONDS) {
      previousRange.end = Math.max(previousRange.end, range.end);
      continue;
    }

    mergedRanges.push({ ...range });
  }

  return mergedRanges;
}

function splitTranscriptWords(text) {
  return String(text)
    .split(/\s+/)
    .filter((word) => word.trim().length > 0);
}

function mergeSlowWordRanges(resolvedSlowMoments) {
  const sortedRanges = [...(resolvedSlowMoments ?? [])]
    .map((moment) => ({
      startWordIndexInclusive: Number(moment.startWordIndexInclusive),
      endWordIndexInclusive: Number(moment.endWordIndexInclusive),
    }))
    .filter(
      (range) =>
        Number.isInteger(range.startWordIndexInclusive) &&
        Number.isInteger(range.endWordIndexInclusive) &&
        range.startWordIndexInclusive >= 0 &&
        range.endWordIndexInclusive >= range.startWordIndexInclusive,
    )
    .sort(
      (left, right) =>
        left.startWordIndexInclusive - right.startWordIndexInclusive ||
        left.endWordIndexInclusive - right.endWordIndexInclusive,
    );

  if (sortedRanges.length === 0) {
    return [];
  }

  const mergedRanges = [{ ...sortedRanges[0] }];
  for (const range of sortedRanges.slice(1)) {
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (
      range.startWordIndexInclusive <= previousRange.endWordIndexInclusive + 1
    ) {
      previousRange.endWordIndexInclusive = Math.max(
        previousRange.endWordIndexInclusive,
        range.endWordIndexInclusive,
      );
      continue;
    }

    mergedRanges.push({ ...range });
  }

  return mergedRanges;
}

function buildWholeClipSegment({ audioFile, durationSeconds, mode = "fast" }) {
  return {
    startSeconds: 0,
    endSeconds: durationSeconds,
    factor: mode === "slow" ? SLOW_PITCH_FACTOR : FAST_PITCH_FACTOR,
    mode,
    text: String(audioFile.text ?? "").trim(),
    startWordIndexInclusive: 0,
    endWordIndexInclusive:
      Math.max(splitTranscriptWords(audioFile.text).length - 1, 0),
  };
}

function buildSegmentFromWordRange({
  transcriptWords,
  alignedWords,
  startWordIndexInclusive,
  endWordIndexInclusive,
  durationSeconds,
  mode,
}) {
  if (endWordIndexInclusive < startWordIndexInclusive) {
    return null;
  }

  const text = transcriptWords
    .slice(startWordIndexInclusive, endWordIndexInclusive + 1)
    .join(" ")
    .trim();

  if (!text) {
    return null;
  }

  const firstWord = alignedWords[startWordIndexInclusive];
  const nextWord = alignedWords[endWordIndexInclusive + 1];
  const lastWord = alignedWords[endWordIndexInclusive];

  let startSeconds =
    startWordIndexInclusive === 0 ? 0 : Number(firstWord?.start ?? 0);
  let endSeconds =
    endWordIndexInclusive + 1 < alignedWords.length
      ? Number(nextWord?.start ?? durationSeconds)
      : Number(lastWord?.end ?? durationSeconds);

  if (!Number.isFinite(startSeconds)) {
    startSeconds = 0;
  }

  if (!Number.isFinite(endSeconds)) {
    endSeconds = durationSeconds;
  }

  startSeconds = clamp(startSeconds, 0, durationSeconds);
  endSeconds = clamp(endSeconds, startSeconds, durationSeconds);

  if (endWordIndexInclusive === transcriptWords.length - 1) {
    endSeconds = durationSeconds;
  }

  return {
    startSeconds,
    endSeconds,
    factor: mode === "slow" ? SLOW_PITCH_FACTOR : FAST_PITCH_FACTOR,
    mode,
    text,
    startWordIndexInclusive,
    endWordIndexInclusive,
  };
}

function segmentDuration(segment) {
  return Math.max(0, Number(segment.endSeconds) - Number(segment.startSeconds));
}

function mergeSegments(left, right, keepMode = "left") {
  if (keepMode === "right") {
    return {
      ...right,
      startSeconds: left.startSeconds,
      text: `${left.text} ${right.text}`.trim(),
      startWordIndexInclusive: left.startWordIndexInclusive,
    };
  }

  return {
    ...left,
    endSeconds: right.endSeconds,
    text: `${left.text} ${right.text}`.trim(),
    endWordIndexInclusive: right.endWordIndexInclusive,
  };
}

function normalizeClipSegments(segments, durationSeconds) {
  const clampedSegments = [];

  for (const rawSegment of segments) {
    if (!rawSegment || rawSegment.text.length === 0) {
      continue;
    }

    const previousSegment = clampedSegments[clampedSegments.length - 1] ?? null;
    const startSeconds = clamp(
      Math.max(
        Number(rawSegment.startSeconds) || 0,
        previousSegment?.endSeconds ?? 0,
      ),
      0,
      durationSeconds,
    );
    const endSeconds = clamp(
      Math.max(Number(rawSegment.endSeconds) || startSeconds, startSeconds),
      startSeconds,
      durationSeconds,
    );
    const normalizedSegment = {
      ...rawSegment,
      startSeconds,
      endSeconds,
    };

    if (
      previousSegment &&
      previousSegment.mode === normalizedSegment.mode &&
      previousSegment.endSeconds >= normalizedSegment.startSeconds
    ) {
      clampedSegments[clampedSegments.length - 1] = mergeSegments(
        previousSegment,
        normalizedSegment,
      );
      continue;
    }

    clampedSegments.push(normalizedSegment);
  }

  if (clampedSegments.length <= 1) {
    return clampedSegments.filter(
      (segment) => segmentDuration(segment) > 0 && segment.text.length > 0,
    );
  }

  const mergedSegments = [...clampedSegments];
  let segmentIndex = 0;

  while (segmentIndex < mergedSegments.length) {
    const currentSegment = mergedSegments[segmentIndex];
    if (
      currentSegment &&
      segmentDuration(currentSegment) >= MIN_RENDER_DURATION_SECONDS
    ) {
      segmentIndex += 1;
      continue;
    }

    if (mergedSegments.length === 1) {
      break;
    }

    const previousSegment = segmentIndex > 0 ? mergedSegments[segmentIndex - 1] : null;
    const nextSegment =
      segmentIndex + 1 < mergedSegments.length ? mergedSegments[segmentIndex + 1] : null;

    if (!previousSegment && nextSegment) {
      mergedSegments.splice(
        segmentIndex,
        2,
        mergeSegments(currentSegment, nextSegment, "right"),
      );
      continue;
    }

    if (previousSegment && !nextSegment) {
      mergedSegments.splice(
        segmentIndex - 1,
        2,
        mergeSegments(previousSegment, currentSegment),
      );
      segmentIndex = Math.max(0, segmentIndex - 1);
      continue;
    }

    if (!previousSegment || !nextSegment) {
      break;
    }

    if (
      previousSegment.mode === currentSegment.mode &&
      nextSegment.mode !== currentSegment.mode
    ) {
      mergedSegments.splice(
        segmentIndex - 1,
        2,
        mergeSegments(previousSegment, currentSegment),
      );
      segmentIndex = Math.max(0, segmentIndex - 1);
      continue;
    }

    if (
      nextSegment.mode === currentSegment.mode &&
      previousSegment.mode !== currentSegment.mode
    ) {
      mergedSegments.splice(
        segmentIndex,
        2,
        mergeSegments(currentSegment, nextSegment, "right"),
      );
      continue;
    }

    if (segmentDuration(previousSegment) >= segmentDuration(nextSegment)) {
      mergedSegments.splice(
        segmentIndex - 1,
        2,
        mergeSegments(previousSegment, currentSegment),
      );
      segmentIndex = Math.max(0, segmentIndex - 1);
      continue;
    }

    mergedSegments.splice(
      segmentIndex,
      2,
      mergeSegments(currentSegment, nextSegment, "right"),
    );
  }

  return mergedSegments.filter(
    (segment) => segmentDuration(segment) > 0 && segment.text.length > 0,
  );
}

function buildClipSegments({
  audioFile,
  alignment,
  resolvedSlowMoments,
  durationSeconds,
}) {
  const transcriptWords = splitTranscriptWords(audioFile.text);
  const alignedWords = Array.isArray(alignment?.alignedWords)
    ? alignment.alignedWords
    : [];

  if (
    transcriptWords.length === 0 ||
    alignedWords.length === 0 ||
    alignedWords.length !== transcriptWords.length
  ) {
    return [buildWholeClipSegment({ audioFile, durationSeconds })];
  }

  const slowWordRanges = mergeSlowWordRanges(resolvedSlowMoments);
  if (slowWordRanges.length === 0) {
    return [
      buildSegmentFromWordRange({
        transcriptWords,
        alignedWords,
        startWordIndexInclusive: 0,
        endWordIndexInclusive: transcriptWords.length - 1,
        durationSeconds,
        mode: "fast",
      }),
    ].filter(Boolean);
  }

  const segments = [];
  let cursorWordIndex = 0;

  for (const slowRange of slowWordRanges) {
    if (slowRange.startWordIndexInclusive > cursorWordIndex) {
      segments.push(
        buildSegmentFromWordRange({
          transcriptWords,
          alignedWords,
          startWordIndexInclusive: cursorWordIndex,
          endWordIndexInclusive: slowRange.startWordIndexInclusive - 1,
          durationSeconds,
          mode: "fast",
        }),
      );
    }

    segments.push(
      buildSegmentFromWordRange({
        transcriptWords,
        alignedWords,
        startWordIndexInclusive: slowRange.startWordIndexInclusive,
        endWordIndexInclusive: Math.min(
          slowRange.endWordIndexInclusive,
          transcriptWords.length - 1,
        ),
        durationSeconds,
        mode: "slow",
      }),
    );

    cursorWordIndex = slowRange.endWordIndexInclusive + 1;
  }

  if (cursorWordIndex < transcriptWords.length) {
    segments.push(
      buildSegmentFromWordRange({
        transcriptWords,
        alignedWords,
        startWordIndexInclusive: cursorWordIndex,
        endWordIndexInclusive: transcriptWords.length - 1,
        durationSeconds,
        mode: "fast",
      }),
    );
  }

  const normalizedSegments = normalizeClipSegments(segments, durationSeconds);

  if (normalizedSegments.length === 0) {
    return [buildWholeClipSegment({ audioFile, durationSeconds })];
  }

  return normalizedSegments;
}

async function renderSegment({
  inputPath,
  outputPath,
  startSeconds,
  endSeconds,
  factor,
  sampleRate,
}) {
  const segmentDuration = Math.max(
    MIN_RENDER_DURATION_SECONDS,
    endSeconds - startSeconds,
  );
  const safeEndSeconds = startSeconds + segmentDuration;

  await execFileP(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-af",
      [
        `atrim=start=${startSeconds.toFixed(3)}:end=${safeEndSeconds.toFixed(3)}`,
        "asetpts=PTS-STARTPTS",
        `asetrate=${sampleRate}*${factor}`,
        `aresample=${sampleRate}`,
      ].join(","),
      "-ar",
      String(sampleRate),
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ],
    {
      maxBuffer: 1024 * 1024 * 20,
    },
  );
}

async function ensureReadableRenderedSegment({
  segmentPath,
  segmentBaseName,
  startSeconds,
  endSeconds,
  factor,
}) {
  try {
    await probeAudioFile(segmentPath);
  } catch (error) {
    throw new Error(
      [
        `Rendered pitch segment is unreadable: ${segmentBaseName}`,
        `path=${segmentPath}`,
        `start=${startSeconds.toFixed(3)}`,
        `end=${endSeconds.toFixed(3)}`,
        `factor=${factor}`,
        error instanceof Error ? error.message : String(error),
      ].join(" "),
    );
  }
}

async function transformAudioFile({
  audioFile,
  outputDir,
  alignment,
  resolvedSlowMoments,
}) {
  const { sampleRate, durationSeconds } = await probeAudioFile(audioFile.path);
  const clipSegments = buildClipSegments({
    audioFile,
    alignment,
    resolvedSlowMoments,
    durationSeconds,
  });
  const segmentDir = path.join(outputDir, `${audioFile.person}-${audioFile.index}`);

  await fs.rm(segmentDir, { recursive: true, force: true });
  await fs.mkdir(segmentDir, { recursive: true });

  const renderedSegments = [];
  for (const [segmentIndex, segment] of clipSegments.entries()) {
    const segmentBaseName = `${audioFile.person}-${audioFile.index}-${segmentIndex}-${segment.mode}`;
    const segmentPath = path.join(
      segmentDir,
      `${segmentBaseName}.mp3`,
    );
    await renderSegment({
      inputPath: audioFile.path,
      outputPath: segmentPath,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      factor: segment.factor,
      sampleRate,
    });
    await ensureReadableRenderedSegment({
      segmentPath,
      segmentBaseName,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      factor: segment.factor,
    });

    renderedSegments.push({
      ...audioFile,
      path: segmentPath,
      text: segment.text,
      srtFileName: `${segmentBaseName}.srt`,
      pitchModeSegmentIndex: segmentIndex,
      pitchModeSegmentMode: segment.mode,
      pitchModeInterval: {
        start: segment.startSeconds,
        end: segment.endSeconds,
        factor: segment.factor,
        mode: segment.mode,
        startWordIndexInclusive: segment.startWordIndexInclusive,
        endWordIndexInclusive: segment.endWordIndexInclusive,
      },
      silenceAfterSeconds: 0,
    });
  }

  return {
    sampleRate,
    durationSeconds,
    segments: renderedSegments,
  };
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

      const item = items[currentIndex];
      results[currentIndex] = await mapper(item, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: normalizedConcurrency }, () => worker()),
  );

  return results;
}

export async function applyPitchModeToAudioFiles({
  workDir,
  audioFiles,
  alignmentData,
  resolvedSlowMoments,
}) {
  const transformedVoiceDir = path.join(workDir, "voice-pitch");
  const alignmentsByKey = new Map(
    (alignmentData ?? []).map((entry) => [toKey(entry.person, entry.index), entry]),
  );
  const slowMomentsByIndex = new Map();

  for (const moment of resolvedSlowMoments ?? []) {
    const moments = slowMomentsByIndex.get(moment.entryIndex) ?? [];
    moments.push(moment);
    slowMomentsByIndex.set(moment.entryIndex, moments);
  }

  await fs.rm(transformedVoiceDir, { recursive: true, force: true });
  await fs.mkdir(transformedVoiceDir, { recursive: true });

  const transformedAudioResults = await mapWithConcurrency(
    audioFiles,
    PITCH_MODE_AUDIO_CONCURRENCY,
    async (audioFile) => {
      const alignment = alignmentsByKey.get(toKey(audioFile.person, audioFile.index));
      const clipSlowMoments = slowMomentsByIndex.get(audioFile.index) ?? [];
      const transformResult = await transformAudioFile({
        audioFile,
        outputDir: transformedVoiceDir,
        alignment,
        resolvedSlowMoments: clipSlowMoments,
      });

      return transformResult.segments;
    },
  );

  const flattenedAudioFiles = transformedAudioResults.flatMap((segments) => segments);

  for (const segments of transformedAudioResults) {
    if (segments.length === 0) {
      continue;
    }

    segments[segments.length - 1].silenceAfterSeconds = DIALOGUE_GAP_SECONDS;
  }

  if (flattenedAudioFiles.length > 0) {
    flattenedAudioFiles[flattenedAudioFiles.length - 1].silenceAfterSeconds = 0;
  }

  return {
    audioFiles: flattenedAudioFiles,
  };
}
