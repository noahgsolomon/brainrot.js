// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveScriptPath() {
  const localPath = path.join(__dirname, "transcribe_and_generate_srt.py");
  const deployedPath = "/app/transcribe_and_generate_srt.py";

  if (await pathExists(localPath)) {
    return localPath;
  }

  if (await pathExists(deployedPath)) {
    return deployedPath;
  }

  throw new Error(
    `Could not find transcribe_and_generate_srt.py at ${localPath} or ${deployedPath}`,
  );
}

async function resolvePythonBinary() {
  const configuredBinary = process.env.FAL_PYTHON_BIN?.trim();
  const localVenvBinary = path.join(__dirname, ".venv", "bin", "python");
  const candidateBinaries = [
    configuredBinary,
    localVenvBinary,
    "python3",
  ].filter(Boolean);

  for (const candidateBinary of candidateBinaries) {
    if (
      candidateBinary === "python3" ||
      candidateBinary === "python" ||
      (await pathExists(candidateBinary))
    ) {
      return candidateBinary;
    }
  }

  throw new Error(
    `Could not resolve a Python interpreter for the subtitle pipeline. Checked: ${candidateBinaries.join(", ")}`,
  );
}

async function runPythonScript(args) {
  const pythonBinary = await resolvePythonBinary();
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBinary, args, {
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Python subtitle pipeline exited with code ${code}: ${
              stderr || stdout || "unknown error"
            }`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(
          new Error(
            `Python subtitle pipeline returned invalid JSON: ${
              stdout || stderr || String(error)
            }`,
          ),
        );
      }
    });
  });
}

async function writeMockSubtitleOutputs({ workDir, audioFiles }) {
  const srtDir = path.join(workDir, "srt");
  const outputAudioPath = path.join(workDir, "audio.mp3");
  await fs.mkdir(srtDir, { recursive: true });

  const srtFiles = [];
  const timelineEntries = [];
  let totalDurationSeconds = 0;
  let timelineOffsetSeconds = 0;
  for (const audioFile of audioFiles) {
    const fileName =
      typeof audioFile.srtFileName === "string" && audioFile.srtFileName.length > 0
        ? audioFile.srtFileName
        : `${audioFile.person}-${audioFile.index}.srt`;
    const srtPath = path.join(srtDir, fileName);
    await fs.writeFile(
      srtPath,
      `1\n00:00:00,000 --> 00:00:00,500\n${audioFile.text.split(/\s+/)[0] ?? "mock"}\n`,
      "utf8",
    );
    srtFiles.push({
      person: audioFile.person,
      index: audioFile.index,
      fileName,
      path: srtPath,
    });
    timelineEntries.push({
      person: audioFile.person,
      index: audioFile.index,
      fileName,
      startSeconds: timelineOffsetSeconds,
      endSeconds: timelineOffsetSeconds + 0.5,
      pitchModeSegmentIndex:
        typeof audioFile.pitchModeSegmentIndex === "number"
          ? audioFile.pitchModeSegmentIndex
          : null,
      pitchModeSegmentMode:
        typeof audioFile.pitchModeSegmentMode === "string"
          ? audioFile.pitchModeSegmentMode
          : null,
    });
    const silenceAfterSeconds = Number(audioFile.silenceAfterSeconds ?? 0);
    totalDurationSeconds += 0.5 + silenceAfterSeconds;
    timelineOffsetSeconds += 0.5 + silenceAfterSeconds;
  }

  await fs.writeFile(
    outputAudioPath,
    Buffer.from(`MOCK_CONCAT_AUDIO:${new Date().toISOString()}`, "utf8"),
  );

  return {
    ok: true,
    outputAudioPath,
    srtFiles,
    timelineEntries,
    totalDurationSeconds,
  };
}

function extractSrtBlocks(srtContent) {
  return String(srtContent)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function renumberSrtBlocks(blocks) {
  return blocks
    .map((block, index) => {
      const lines = block.split("\n");
      const bodyLines =
        /^\d+$/.test(lines[0]?.trim() ?? "") ? lines.slice(1) : lines;
      return `${index + 1}\n${bodyLines.join("\n").trim()}`;
    })
    .join("\n\n")
    .concat(blocks.length > 0 ? "\n" : "");
}

async function mergeSrtFilesByDialogueTurn({ workDir, srtFiles }) {
  const mergedSrtDir = path.join(workDir, "srt-merged");
  await fs.rm(mergedSrtDir, { recursive: true, force: true });
  await fs.mkdir(mergedSrtDir, { recursive: true });

  const groups = [];
  const groupsByKey = new Map();

  for (const srtFile of srtFiles) {
    const groupKey = `${srtFile.person}:${srtFile.index}`;
    let group = groupsByKey.get(groupKey);

    if (!group) {
      group = {
        person: srtFile.person,
        index: srtFile.index,
        fileName: `${srtFile.person}-${srtFile.index}.srt`,
        blocks: [],
      };
      groupsByKey.set(groupKey, group);
      groups.push(group);
    }

    const srtContent = await fs.readFile(srtFile.path, "utf8");
    group.blocks.push(...extractSrtBlocks(srtContent));
  }

  const mergedSrtFiles = [];
  for (const group of groups) {
    const mergedPath = path.join(mergedSrtDir, group.fileName);
    const mergedContent = renumberSrtBlocks(group.blocks);
    await fs.writeFile(mergedPath, mergedContent, "utf8");
    mergedSrtFiles.push({
      person: group.person,
      index: group.index,
      fileName: group.fileName,
      path: mergedPath,
    });
  }

  return mergedSrtFiles;
}

async function runAlignmentOnlyPythonPipeline({ workDir, audioFiles }) {
  const inputJsonPath = path.join(workDir, "subtitle-alignment-input.json");
  const inputPayload = {
    workDir,
    mode: "alignment_only",
    audioFiles: audioFiles.map((audioFile) => ({
      person: audioFile.person,
      index: audioFile.index,
      path: audioFile.path,
      text: audioFile.text,
    })),
  };

  await fs.writeFile(inputJsonPath, JSON.stringify(inputPayload, null, 2), "utf8");
  const scriptPath = await resolveScriptPath();

  return runPythonScript([
    scriptPath,
    "--input-json",
    inputJsonPath,
  ]);
}

export async function runPythonAlignmentPipeline({
  workDir,
  audioFiles,
  useMockServices,
}) {
  if (useMockServices) {
    return {
      ok: true,
      audioFiles: [],
    };
  }

  return runAlignmentOnlyPythonPipeline({
    workDir,
    audioFiles,
  });
}

export async function runPythonSrtPipeline({
  workDir,
  audioFiles,
  reportProgress,
  useMockServices,
  startProgress = 24,
  completeProgress = 35,
}) {
  await reportProgress("Generating subtitle files", startProgress, {
    phase: "brainrot_transcript_audio",
    phaseKey: "subtitle_generation_start",
  });

  if (useMockServices) {
    const mockResult = await writeMockSubtitleOutputs({
      workDir,
      audioFiles,
    });
    const mergedSrtFiles = await mergeSrtFilesByDialogueTurn({
      workDir,
      srtFiles: mockResult.srtFiles,
    });

    await reportProgress("Subtitle files ready", completeProgress, {
      phase: "brainrot_transcript_audio",
      phaseKey: "subtitle_generation_complete",
      subtitleFileCount: mergedSrtFiles.length,
    });
    return {
      ...mockResult,
      splitSrtFiles: mockResult.srtFiles,
      srtFiles: mergedSrtFiles,
    };
  }

  const inputJsonPath = path.join(workDir, "subtitle-input.json");
  const inputPayload = {
    workDir,
    mode: "full",
    outputAudioPath: path.join(workDir, "audio.mp3"),
    outputSrtDir: path.join(workDir, "srt"),
    silenceDurationSeconds: 0.2,
    audioFiles: audioFiles.map((audioFile) => {
      const silenceAfterSeconds = Number(audioFile.silenceAfterSeconds);
      return {
        person: audioFile.person,
        index: audioFile.index,
        path: audioFile.path,
        text: audioFile.text,
        srtFileName:
          typeof audioFile.srtFileName === "string" ? audioFile.srtFileName : undefined,
        pitchModeSegmentIndex:
          typeof audioFile.pitchModeSegmentIndex === "number"
            ? audioFile.pitchModeSegmentIndex
            : undefined,
        pitchModeSegmentMode:
          typeof audioFile.pitchModeSegmentMode === "string"
            ? audioFile.pitchModeSegmentMode
            : undefined,
        silenceAfterSeconds: Number.isFinite(silenceAfterSeconds)
          ? silenceAfterSeconds
          : undefined,
      };
    }),
  };

  await fs.writeFile(inputJsonPath, JSON.stringify(inputPayload, null, 2), "utf8");
  const scriptPath = await resolveScriptPath();

  const result = await runPythonScript([
    scriptPath,
    "--input-json",
    inputJsonPath,
  ]);

  const mergedSrtFiles = await mergeSrtFilesByDialogueTurn({
    workDir,
    srtFiles: Array.isArray(result.srtFiles) ? result.srtFiles : [],
  });

  await reportProgress("Subtitle files ready", completeProgress, {
    phase: "brainrot_transcript_audio",
    phaseKey: "subtitle_generation_complete",
    subtitleFileCount: mergedSrtFiles.length,
  });

  return {
    ...result,
    splitSrtFiles: Array.isArray(result.srtFiles) ? result.srtFiles : [],
    srtFiles: mergedSrtFiles,
  };
}
