// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runBrainrotTranscriptAudioJob } from "./brainrot_transcript_audio.mjs";

const COMPOSITION_ID = "BrainrotRenderTest";

/** @type {Promise<string> | null} */
let cachedBundlePromise = null;

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRemotionRuntimeDir() {
  const candidates = [
    path.join("/app", "remotion_runtime"),
    path.join(path.dirname(new URL(import.meta.url).pathname), "remotion_runtime"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not find the remotion_runtime directory.");
}

async function importRemotionModule(entryPathCandidates) {
  for (const candidate of entryPathCandidates) {
    if (await pathExists(candidate)) {
      return import(pathToFileURL(candidate).href);
    }
  }

  throw new Error(
    `Could not find any Remotion module entry point. Tried: ${entryPathCandidates.join(
      ", ",
    )}`,
  );
}

async function loadBundlerModule() {
  const runtimeDir = await findRemotionRuntimeDir();
  const runtimeNodeModules = path.join(runtimeDir, "node_modules");

  return importRemotionModule([
    path.join(runtimeNodeModules, "@remotion", "bundler", "dist", "index.js"),
    path.join(
      process.cwd(),
      "generate",
      "node_modules",
      "@remotion",
      "bundler",
      "dist",
      "index.js",
    ),
  ]);
}

async function loadRendererModule() {
  const runtimeDir = await findRemotionRuntimeDir();
  const runtimeNodeModules = path.join(runtimeDir, "node_modules");

  return importRemotionModule([
    path.join(runtimeNodeModules, "@remotion", "renderer", "dist", "index.js"),
    path.join(
      process.cwd(),
      "generate",
      "node_modules",
      "@remotion",
      "renderer",
      "dist",
      "index.js",
    ),
  ]);
}

async function getBundleUrl(reportProgress) {
  if (!cachedBundlePromise) {
    cachedBundlePromise = (async () => {
      const runtimeDir = await findRemotionRuntimeDir();
      const entryPoint = path.join(runtimeDir, "src", "index.jsx");
      const { bundle } = await loadBundlerModule();

      let lastReportedProgress = -1;
      await reportProgress("Bundling Remotion project", 40, {
        phase: "brainrot_remotion_render",
      });

      return bundle({
        entryPoint,
        rootDir: runtimeDir,
        onProgress: (progress) => {
          const pct = Math.max(40, Math.min(56, 40 + Math.round(progress * 16)));
          if (pct !== lastReportedProgress) {
            lastReportedProgress = pct;
            void reportProgress("Bundling Remotion project", pct, {
              phase: "brainrot_remotion_render",
            });
          }
        },
      });
    })();

    cachedBundlePromise.catch(() => {
      cachedBundlePromise = null;
    });
  }

  return cachedBundlePromise;
}

function sanitizeJobId(jobId) {
  return String(jobId || "job").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function copyFile(sourcePath, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

async function copyDirectoryIfMissing(sourcePath, destinationPath) {
  if (await pathExists(destinationPath)) {
    return;
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
}

async function ensureRuntimeStaticAssets() {
  const runtimeDir = await findRemotionRuntimeDir();
  const runtimePublicDir = path.join(runtimeDir, "public");
  const repoGeneratePublicDir = path.join(process.cwd(), "generate", "public");

  await copyDirectoryIfMissing(
    path.join(repoGeneratePublicDir, "background"),
    path.join(runtimePublicDir, "background"),
  );
  await copyDirectoryIfMissing(
    path.join(repoGeneratePublicDir, "pose"),
    path.join(runtimePublicDir, "pose"),
  );
  await copyDirectoryIfMissing(
    path.join(repoGeneratePublicDir, "music"),
    path.join(runtimePublicDir, "music"),
  );
}

async function stageRemotionAssets({ jobId, prepResult }) {
  const runtimeDir = await findRemotionRuntimeDir();
  const publicDir = path.join(runtimeDir, "public");
  const jobPublicDir = path.join(publicDir, "jobs", jobId);
  const jobSrtDir = path.join(jobPublicDir, "srt");

  await fs.rm(jobPublicDir, { recursive: true, force: true });
  await fs.mkdir(jobSrtDir, { recursive: true });

  const stagedAudioRelativePath = path.posix.join("jobs", jobId, "audio.mp3");
  const stagedAudioPath = path.join(jobPublicDir, "audio.mp3");
  await copyFile(prepResult.outputAudioPath, stagedAudioPath);

  const stagedSubtitleFiles = [];
  for (const subtitleFile of prepResult.srtFiles) {
    const relativeFilePath = path.posix.join(
      "jobs",
      jobId,
      "srt",
      `${subtitleFile.person}-${subtitleFile.index}.srt`,
    );
    await copyFile(
      subtitleFile.path,
      path.join(publicDir, relativeFilePath),
    );

    stagedSubtitleFiles.push({
      name: subtitleFile.person,
      file: relativeFilePath,
    });
  }

  return {
    audioFileName: stagedAudioRelativePath,
    subtitlesFileName: stagedSubtitleFiles,
  };
}

export async function runRemotionBrainrotRenderJob(input) {
  const safeJobId = sanitizeJobId(input.jobId);
  const workDir = path.join("/tmp", "brainrot", safeJobId);
  const outputVideoPath = path.join(workDir, "brainrot-render-test.mp4");

  const prepResult = await runBrainrotTranscriptAudioJob({
    jobId: input.jobId,
    props: input.props,
    reportProgress: input.reportProgress,
  });

  await input.reportProgress("Staging Remotion assets", 38, {
    phase: "brainrot_remotion_render",
  });
  await ensureRuntimeStaticAssets();
  const stagedAssets = await stageRemotionAssets({
    jobId: safeJobId,
    prepResult,
  });

  await fs.mkdir(workDir, { recursive: true });
  const serveUrl = await getBundleUrl(input.reportProgress);
  const {
    openBrowser,
    renderMedia,
    selectComposition,
  } = await loadRendererModule();

  const browserExecutable =
    typeof process.env.REMOTION_BROWSER_EXECUTABLE === "string" &&
    process.env.REMOTION_BROWSER_EXECUTABLE.length > 0
      ? process.env.REMOTION_BROWSER_EXECUTABLE
      : null;

  const inputProps = {
    initialAgentName: prepResult.transcript[0]?.agentId ?? "JOE_ROGAN",
    videoFileName:
      typeof input.props.videoFileName === "string" &&
      input.props.videoFileName.trim().length > 0
        ? input.props.videoFileName.trim().replace(/^\/+/, "")
        : "background/MINECRAFT-0.mp4",
    musicFileName:
      typeof input.props.music === "string" && input.props.music !== "NONE"
        ? `music/${input.props.music}.MP3`
        : null,
    audioFileName: stagedAssets.audioFileName,
    subtitlesFileName: stagedAssets.subtitlesFileName,
    subtitlesLinePerPage: 6,
    subtitlesZoomMeasurerSize: 10,
    subtitlesLineHeight: 128,
    audioOffsetInSeconds: 0,
  };

  await input.reportProgress("Selecting brainrot composition", 58, {
    phase: "brainrot_remotion_render",
    compositionId: COMPOSITION_ID,
  });

  const browser = await openBrowser("chrome", {
    browserExecutable,
    logLevel: "error",
  });

  try {
    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable,
      logLevel: "error",
    });

    let lastProgress = 62;
    await input.reportProgress("Rendering brainrot video", lastProgress, {
      phase: "brainrot_remotion_render",
      compositionId: COMPOSITION_ID,
    });

    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation: outputVideoPath,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable,
      overwrite: true,
      logLevel: "error",
      onProgress: (progress) => {
        const nextProgress = Math.max(
          62,
          Math.min(94, 62 + Math.round(progress.progress * 32)),
        );

        if (nextProgress !== lastProgress) {
          lastProgress = nextProgress;
          void input.reportProgress("Rendering brainrot video", nextProgress, {
            phase: "brainrot_remotion_render",
            renderedFrames: progress.renderedFrames,
            encodedFrames: progress.encodedFrames,
          });
        }
      },
    });
  } finally {
    await browser.close(true);
  }

  await input.reportProgress("Render finished, uploading result", 97, {
    phase: "brainrot_remotion_render",
  });

  return {
    phase: "brainrot_remotion_render",
    compositionId: COMPOSITION_ID,
    workDir,
    transcript: prepResult.transcript,
    transcriptPath: prepResult.transcriptPath,
    outputAudioPath: prepResult.outputAudioPath,
    srtFiles: prepResult.srtFiles,
    outputVideoPath,
  };
}
