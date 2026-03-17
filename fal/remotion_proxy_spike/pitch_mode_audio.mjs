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
const SEGMENT_PADDING_SECONDS = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_SEGMENT_PADDING_SECONDS ?? "0.04",
);
const MIN_INTERVAL_SECONDS = Number.parseFloat(
  process.env.BRAINROT_PITCH_MODE_MIN_INTERVAL_SECONDS ?? "0.04",
);
const PITCH_MODE_AUDIO_CONCURRENCY = Number.parseInt(
  process.env.BRAINROT_PITCH_MODE_AUDIO_CONCURRENCY ?? "2",
  10,
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

function buildSlowTimeRanges({
  alignedWords,
  resolvedSlowMoments,
  durationSeconds,
}) {
  if (!Array.isArray(alignedWords) || alignedWords.length === 0) {
    return [];
  }

  const candidateRanges = resolvedSlowMoments
    .map((moment) => {
      const startWord = alignedWords[moment.startWordIndexInclusive];
      const endWord = alignedWords[moment.endWordIndexInclusive];

      if (!startWord || !endWord) {
        return null;
      }

      const start = clamp(
        Number(startWord.start ?? 0) - SEGMENT_PADDING_SECONDS,
        0,
        durationSeconds,
      );
      const end = clamp(
        Number(endWord.end ?? durationSeconds) + SEGMENT_PADDING_SECONDS,
        0,
        durationSeconds,
      );

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return { start, end };
    })
    .filter(Boolean);

  return mergeTimeRanges(candidateRanges);
}

function buildIntervals({ durationSeconds, slowTimeRanges }) {
  const intervals = [];
  let cursor = 0;

  for (const slowRange of slowTimeRanges) {
    if (slowRange.start - cursor >= MIN_INTERVAL_SECONDS) {
      intervals.push({
        start: cursor,
        end: slowRange.start,
        factor: FAST_PITCH_FACTOR,
        mode: "fast",
      });
    }

    if (slowRange.end - slowRange.start >= MIN_INTERVAL_SECONDS) {
      intervals.push({
        start: slowRange.start,
        end: slowRange.end,
        factor: SLOW_PITCH_FACTOR,
        mode: "slow",
      });
    }

    cursor = Math.max(cursor, slowRange.end);
  }

  if (durationSeconds - cursor >= MIN_INTERVAL_SECONDS) {
    intervals.push({
      start: cursor,
      end: durationSeconds,
      factor: FAST_PITCH_FACTOR,
      mode: "fast",
    });
  }

  if (intervals.length === 0) {
    intervals.push({
      start: 0,
      end: durationSeconds,
      factor: FAST_PITCH_FACTOR,
      mode: "fast",
    });
  }

  return intervals;
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
    MIN_INTERVAL_SECONDS,
    endSeconds - startSeconds,
  );

  await execFileP(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-ss",
      startSeconds.toFixed(3),
      "-t",
      segmentDuration.toFixed(3),
      "-vn",
      "-ac",
      "1",
      "-af",
      `asetrate=${sampleRate}*${factor},aresample=${sampleRate}`,
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

async function concatSegments(segmentPaths, outputPath) {
  const concatListPath = `${outputPath}.segments.txt`;
  const concatList = segmentPaths
    .map((segmentPath) => `file '${segmentPath.replaceAll("'", "'\\''")}'`)
    .join("\n");

  await fs.writeFile(concatListPath, `${concatList}\n`, "utf8");

  await execFileP(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
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

async function transformAudioFile({
  audioFile,
  outputPath,
  alignment,
  resolvedSlowMoments,
}) {
  const { sampleRate, durationSeconds } = await probeAudioFile(audioFile.path);
  const slowTimeRanges = buildSlowTimeRanges({
    alignedWords: alignment?.alignedWords ?? [],
    resolvedSlowMoments,
    durationSeconds,
  });
  const intervals = buildIntervals({
    durationSeconds,
    slowTimeRanges,
  });
  const segmentDir = `${outputPath}.segments`;

  await fs.rm(segmentDir, { recursive: true, force: true });
  await fs.mkdir(segmentDir, { recursive: true });

  const segmentPaths = [];
  for (const [segmentIndex, interval] of intervals.entries()) {
    const segmentPath = path.join(
      segmentDir,
      `${String(segmentIndex).padStart(2, "0")}-${interval.mode}.mp3`,
    );
    await renderSegment({
      inputPath: audioFile.path,
      outputPath: segmentPath,
      startSeconds: interval.start,
      endSeconds: interval.end,
      factor: interval.factor,
      sampleRate,
    });
    segmentPaths.push(segmentPath);
  }

  await concatSegments(segmentPaths, outputPath);

  return {
    sampleRate,
    durationSeconds,
    intervals,
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

  const transformedAudioFiles = await mapWithConcurrency(
    audioFiles,
    PITCH_MODE_AUDIO_CONCURRENCY,
    async (audioFile) => {
      const outputPath = path.join(transformedVoiceDir, path.basename(audioFile.path));
      const alignment = alignmentsByKey.get(toKey(audioFile.person, audioFile.index));
      const clipSlowMoments = slowMomentsByIndex.get(audioFile.index) ?? [];
      const transformResult = await transformAudioFile({
        audioFile,
        outputPath,
        alignment,
        resolvedSlowMoments: clipSlowMoments,
      });

      return {
        ...audioFile,
        path: outputPath,
        pitchModeIntervals: transformResult.intervals,
      };
    },
  );

  return {
    audioFiles: transformedAudioFiles,
  };
}
