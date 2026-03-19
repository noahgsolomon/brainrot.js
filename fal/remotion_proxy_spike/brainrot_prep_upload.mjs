import fs from "node:fs/promises";
import path from "node:path";

import { fal } from "@fal-ai/client";
import { runBrainrotTranscriptAudioJob } from "./brainrot_transcript_audio.mjs";

let configuredFalKey = "";

function ensureFalClientConfigured() {
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    throw new Error("Missing required environment variable: FAL_KEY");
  }

  if (configuredFalKey !== falKey) {
    fal.config({ credentials: falKey });
    configuredFalKey = falKey;
  }
}

function createNamedBlob(buffer, fileName, contentType) {
  const blob = new Blob([buffer], { type: contentType });
  return Object.assign(blob, { name: fileName });
}

async function uploadFile(filePath, fileName, contentType) {
  const buffer = await fs.readFile(filePath);
  const blob = createNamedBlob(buffer, fileName, contentType);
  return fal.storage.upload(blob, { lifecycle: { expiresIn: "7d" } });
}

function buildDebugRelativePath(workDir, filePath) {
  const relativePath = path.relative(workDir, filePath);
  return relativePath.split(path.sep).join("/");
}

async function uploadDebugAudioFiles({ workDir, audioFiles }) {
  return Promise.all(
    (audioFiles ?? []).map(async (audioFile) => {
      const filePath = String(audioFile.path);
      const relativePath = buildDebugRelativePath(workDir, filePath);
      const fileName = path.basename(filePath);
      const url = await uploadFile(filePath, fileName, "audio/mpeg");
      return {
        person: audioFile.person,
        index: audioFile.index,
        fileName,
        relativePath,
        url,
      };
    }),
  );
}

/**
 * @param {{
 *   jobId: string;
 *   props: Record<string, unknown>;
 *   reportProgress: (status: string, progress: number, extra?: Record<string, unknown>) => Promise<void>;
 * }} input
 */
export async function runBrainrotPrepUploadJob(input) {
  const prepResult = await runBrainrotTranscriptAudioJob({
    jobId: input.jobId,
    props: input.props,
    reportProgress: input.reportProgress,
  });

  await input.reportProgress("Uploading prep artifacts", 40, {
    phase: "brainrot_prep_upload",
    phaseKey: "upload_start",
  });

  ensureFalClientConfigured();

  const audioUrl = await uploadFile(
    prepResult.outputAudioPath,
    "audio.mp3",
    "audio/mpeg",
  );

  const contextUrl = await uploadFile(
    prepResult.contextPath,
    "context.tsx",
    "text/plain",
  );

  const transcriptUrl = await uploadFile(
    prepResult.transcriptPath,
    "transcript.json",
    "application/json",
  );

  const manifestUrl = await uploadFile(
    prepResult.manifestPath,
    "audio-manifest.json",
    "application/json",
  );

  const srtUploads = await Promise.all(
    prepResult.srtFiles.map(async (srtFile) => {
      const fileName =
        typeof srtFile.fileName === "string" && srtFile.fileName.length > 0
          ? srtFile.fileName
          : `${srtFile.person}-${srtFile.index}.srt`;
      const url = await uploadFile(srtFile.path, fileName, "text/plain");
      return { person: srtFile.person, index: srtFile.index, fileName, url };
    }),
  );

  const originalVoiceFiles = await uploadDebugAudioFiles({
    workDir: prepResult.workDir,
    audioFiles: prepResult.sourceAudioFiles,
  });

  const pitchVoiceFiles = await uploadDebugAudioFiles({
    workDir: prepResult.workDir,
    audioFiles: prepResult.audioFiles,
  });

  await input.reportProgress("Prep artifacts uploaded", 48, {
    phase: "brainrot_prep_upload",
    phaseKey: "upload_complete",
  });

  return {
    phase: "brainrot_prep_upload",
    workDir: prepResult.workDir,
    transcript: prepResult.transcript,
    artifacts: {
      audioUrl,
      contextUrl,
      transcriptUrl,
      manifestUrl,
      srtFiles: srtUploads,
      originalVoiceFiles,
      pitchVoiceFiles,
    },
  };
}
