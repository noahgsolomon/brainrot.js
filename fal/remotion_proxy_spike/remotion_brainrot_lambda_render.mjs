// @ts-nocheck
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { fal } from "@fal-ai/client";
import { runBrainrotTranscriptAudioJob } from "./brainrot_transcript_audio.mjs";

const execFileP = promisify(execFile);

const SITE_URL_REGEX =
  /https:\/\/[\w.-]+\.s3\.us-east-1\.amazonaws\.com\/sites\/[\w.-]+\/index\.html/;
const RENDER_URL_REGEX =
  /https:\/\/s3\.us-east-1\.amazonaws\.com\/[\w.-]+\/renders\/[\w.-]+\/out\.mp4/;

/**
 * @param {string} jobId
 */
function sanitizeJobId(jobId) {
  return String(jobId || "job").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findGenerateTemplateDir() {
  const candidates = [
    path.join("/app", "generate"),
    path.join(process.cwd(), "generate"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not find the generate template directory.");
}

/**
 * @param {string} templateDir
 * @param {string} projectDir
 */
async function materializeLambdaProject(templateDir, projectDir) {
  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.mkdir(projectDir, { recursive: true });

  for (const fileName of [
    "package.json",
    "tsconfig.json",
    "remotion.config.ts",
    "tailwind.config.js",
  ]) {
    await fs.copyFile(
      path.join(templateDir, fileName),
      path.join(projectDir, fileName),
    );
  }

  await fs.cp(path.join(templateDir, "src"), path.join(projectDir, "src"), {
    recursive: true,
  });
  await fs.cp(path.join(templateDir, "public"), path.join(projectDir, "public"), {
    recursive: true,
  });

  const sharedNodeModules = path.join(templateDir, "node_modules");
  const projectNodeModules = path.join(projectDir, "node_modules");
  await fs.symlink(sharedNodeModules, projectNodeModules, "dir");
}

/**
 * @param {{
 *   projectDir: string;
 *   prepResult: Awaited<ReturnType<typeof runBrainrotTranscriptAudioJob>>;
 * }} input
 */
async function stageGeneratedAssets(input) {
  const publicDir = path.join(input.projectDir, "public");
  const srtDir = path.join(publicDir, "srt");
  const tmpDir = path.join(input.projectDir, "src", "tmp");

  await fs.mkdir(srtDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });

  await fs.copyFile(
    input.prepResult.outputAudioPath,
    path.join(publicDir, "audio.mp3"),
  );

  for (const subtitleFile of input.prepResult.srtFiles) {
    const fileName =
      typeof subtitleFile.fileName === "string" && subtitleFile.fileName.length > 0
        ? subtitleFile.fileName
        : `${subtitleFile.person}-${subtitleFile.index}.srt`;
    const destination = path.join(
      srtDir,
      fileName,
    );
    await fs.copyFile(subtitleFile.path, destination);
  }

  await fs.copyFile(
    input.prepResult.contextPath,
    path.join(tmpDir, "context.tsx"),
  );
}

/**
 * @param {{
 *   executable: string;
 *   args: string[];
 *   cwd: string;
 * }} input
 */
async function execRemotion(input) {
  console.log(
    JSON.stringify({
      type: "remotion_exec_start",
      executable: input.executable,
      args: input.args,
      cwd: input.cwd,
    }),
  );
  const { stdout, stderr } = await execFileP(input.executable, input.args, {
    cwd: input.cwd,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  });

  console.log(
    JSON.stringify({
      type: "remotion_exec_done",
      args: input.args,
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
    }),
  );

  return {
    stdout: String(stdout || ""),
    stderr: String(stderr || ""),
  };
}

/**
 * @param {string} stdout
 * @param {string} stderr
 * @param {RegExp} regex
 * @param {string} label
 */
function extractUrl(stdout, stderr, regex, label) {
  const match = stdout.match(regex) || stderr.match(regex);

  if (!match?.[0]) {
    throw new Error(`Could not find ${label} in Remotion output.`);
  }

  return match[0];
}

/**
 * @param {{
 *   jobId: string;
 *   props: Record<string, unknown>;
 *   reportProgress: (status: string, progress: number, extra?: Record<string, unknown>) => Promise<void>;
 * }} input
 */
export async function runBrainrotLambdaRenderJob(input) {
  const safeJobId = sanitizeJobId(input.jobId);
  const workDir = path.join("/tmp", "brainrot", safeJobId);
  const lambdaProjectDir = path.join(workDir, "lambda-project");
  const siteName = `brainrot-${safeJobId}`.slice(0, 63);

  const prepResult = await runBrainrotTranscriptAudioJob({
    jobId: input.jobId,
    props: input.props,
    reportProgress: input.reportProgress,
  });

  await input.reportProgress("Preparing Remotion Lambda project", 42, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_project_prepare",
  });

  const templateDir = await findGenerateTemplateDir();
  await materializeLambdaProject(templateDir, lambdaProjectDir);
  await stageGeneratedAssets({
    projectDir: lambdaProjectDir,
    prepResult,
  });

  await input.reportProgress("Remotion Lambda project ready", 48, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_project_ready",
  });

  const remotionBinary = path.join(
    templateDir,
    "node_modules",
    ".bin",
    "remotion",
  );

  await input.reportProgress("Uploading Lambda render site", 56, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_site_upload_start",
    siteName,
  });

  const siteCreateResult = await execRemotion({
    executable: remotionBinary,
    args: ["lambda", "sites", "create", "src/index.ts", "--site-name", siteName],
    cwd: lambdaProjectDir,
  });

  const serveUrl = extractUrl(
    siteCreateResult.stdout,
    siteCreateResult.stderr,
    SITE_URL_REGEX,
    "serve URL",
  );

  console.log(
    JSON.stringify({
      type: "lambda_site_created",
      siteName,
      serveUrl,
    }),
  );

  await input.reportProgress("Lambda render site uploaded", 64, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_site_upload_complete",
    siteName,
    serveUrl,
  });

  await input.reportProgress("Rendering on Remotion Lambda", 72, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_render_start",
    siteName,
    serveUrl,
  });

  const renderResult = await execRemotion({
    executable: remotionBinary,
    args: ["lambda", "render", serveUrl, "Video"],
    cwd: lambdaProjectDir,
  });

  const outputVideoUrl = extractUrl(
    renderResult.stdout,
    renderResult.stderr,
    RENDER_URL_REGEX,
    "render output URL",
  );

  console.log(
    JSON.stringify({
      type: "lambda_render_finished",
      outputVideoUrl,
    }),
  );

  await input.reportProgress("Lambda render finished", 95, {
    phase: "brainrot_lambda_render",
    phaseKey: "lambda_render_complete",
    outputVideoUrl,
  });

  let thumbnailUrl = null;
  try {
    await input.reportProgress("Extracting thumbnail", 97, {
      phase: "brainrot_lambda_render",
      phaseKey: "thumbnail_extract",
    });

    const falKey = process.env.FAL_KEY?.trim();
    if (falKey) {
      fal.config({ credentials: falKey });
    }

    const frameResult = await fal.subscribe("fal-ai/ffmpeg-api/extract-frame", {
      input: {
        video_url: outputVideoUrl,
        frame_type: "middle",
      },
    });

    const images = frameResult.data?.images;
    if (images && images.length > 0 && images[0].url) {
      thumbnailUrl = images[0].url;
      console.log(JSON.stringify({ type: "thumbnail_extracted", thumbnailUrl }));
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        type: "thumbnail_extract_error",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return {
    phase: "brainrot_lambda_render",
    workDir,
    lambdaProjectDir,
    siteName,
    serveUrl,
    transcript: prepResult.transcript,
    transcriptPath: prepResult.transcriptPath,
    outputAudioPath: prepResult.outputAudioPath,
    srtFiles: prepResult.srtFiles,
    outputVideoUrl,
    thumbnailUrl,
  };
}
