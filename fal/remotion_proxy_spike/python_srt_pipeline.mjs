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
  for (const audioFile of audioFiles) {
    const srtPath = path.join(srtDir, `${audioFile.person}-${audioFile.index}.srt`);
    await fs.writeFile(
      srtPath,
      `1\n00:00:00,000 --> 00:00:00,500\n${audioFile.text.split(/\s+/)[0] ?? "mock"}\n`,
      "utf8",
    );
    srtFiles.push({
      person: audioFile.person,
      index: audioFile.index,
      path: srtPath,
    });
  }

  await fs.writeFile(
    outputAudioPath,
    Buffer.from(`MOCK_CONCAT_AUDIO:${new Date().toISOString()}`, "utf8"),
  );

  return {
    ok: true,
    outputAudioPath,
    srtFiles,
    totalDurationSeconds: audioFiles.length,
  };
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

    await reportProgress("Subtitle files ready", completeProgress, {
      phase: "brainrot_transcript_audio",
      phaseKey: "subtitle_generation_complete",
      subtitleFileCount: mockResult.srtFiles.length,
    });
    return mockResult;
  }

  const inputJsonPath = path.join(workDir, "subtitle-input.json");
  const inputPayload = {
    workDir,
    mode: "full",
    outputAudioPath: path.join(workDir, "audio.mp3"),
    outputSrtDir: path.join(workDir, "srt"),
    silenceDurationSeconds: 0.2,
    audioFiles: audioFiles.map((audioFile) => ({
      person: audioFile.person,
      index: audioFile.index,
      path: audioFile.path,
      text: audioFile.text,
    })),
  };

  await fs.writeFile(inputJsonPath, JSON.stringify(inputPayload, null, 2), "utf8");
  const scriptPath = await resolveScriptPath();

  const result = await runPythonScript([
    scriptPath,
    "--input-json",
    inputJsonPath,
  ]);

  await reportProgress("Subtitle files ready", completeProgress, {
    phase: "brainrot_transcript_audio",
    phaseKey: "subtitle_generation_complete",
    subtitleFileCount: Array.isArray(result.srtFiles) ? result.srtFiles.length : 0,
  });

  return result;
}
