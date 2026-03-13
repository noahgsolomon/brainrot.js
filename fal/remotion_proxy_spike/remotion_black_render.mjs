import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_TITLE = "fal remotion render test";
const COMPOSITION_ID = "BlackRenderTest";
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_IN_FRAMES = 45;
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 1280;

/** @type {Promise<string> | null} */
let cachedBundlePromise = null;

/**
 * @param {string} target
 * @returns {Promise<boolean>}
 */
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

/**
 * @param {string[]} entryPathCandidates
 */
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

/**
 * @param {(status: string, progress: number, extra?: Record<string, unknown>) => Promise<void>} reportProgress
 */
async function getBundleUrl(reportProgress) {
  if (!cachedBundlePromise) {
    cachedBundlePromise = (async () => {
      const runtimeDir = await findRemotionRuntimeDir();
      const entryPoint = path.join(runtimeDir, "src", "index.jsx");
      const { bundle } = await loadBundlerModule();

      let lastReportedProgress = -1;
      await reportProgress("Bundling Remotion project", 8, {
        phase: "remotion_black_render",
      });

      return bundle({
        entryPoint,
        rootDir: runtimeDir,
        /** @param {number} progress */
        onProgress: (progress) => {
          const pct = Math.max(8, Math.min(24, 8 + Math.round(progress * 16)));
          if (pct !== lastReportedProgress) {
            lastReportedProgress = pct;
            void reportProgress("Bundling Remotion project", pct, {
              phase: "remotion_black_render",
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

/**
 * @param {{
 *   jobId: string;
 *   props: Record<string, unknown>;
 *   reportProgress: (status: string, progress: number, extra?: Record<string, unknown>) => Promise<void>;
 * }} input
 */
export async function runRemotionBlackRenderJob(input) {
  const safeJobId = String(input.jobId || "job").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const workDir = path.join("/tmp", "brainrot", safeJobId);
  const outputVideoPath = path.join(workDir, "black-render-test.mp4");
  const title =
    typeof input.props.title === "string" && input.props.title.trim().length > 0
      ? input.props.title.trim()
      : DEFAULT_TITLE;
  const inputProps = {
    title,
  };

  await fs.mkdir(workDir, { recursive: true });
  await input.reportProgress("Preparing Remotion render", 3, {
    phase: "remotion_black_render",
  });

  const serveUrl = await getBundleUrl(input.reportProgress);
  const {
    openBrowser,
    renderMedia,
    selectComposition,
  } = await loadRendererModule();

  await input.reportProgress("Selecting composition", 28, {
    phase: "remotion_black_render",
    compositionId: COMPOSITION_ID,
  });

  const browserExecutable =
    typeof process.env.REMOTION_BROWSER_EXECUTABLE === "string" &&
    process.env.REMOTION_BROWSER_EXECUTABLE.length > 0
      ? process.env.REMOTION_BROWSER_EXECUTABLE
      : null;

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

    let lastProgress = 35;
    await input.reportProgress("Rendering black test video", lastProgress, {
      phase: "remotion_black_render",
      fps: DEFAULT_FPS,
      durationInFrames: DEFAULT_DURATION_IN_FRAMES,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
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
      /** @param {{ progress: number; renderedFrames: number; encodedFrames: number }} progress */
      onProgress: (progress) => {
        const nextProgress = Math.max(
          35,
          Math.min(94, 35 + Math.round(progress.progress * 59)),
        );

        if (nextProgress !== lastProgress) {
          lastProgress = nextProgress;
          void input.reportProgress("Rendering black test video", nextProgress, {
            phase: "remotion_black_render",
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
    phase: "remotion_black_render",
  });

  return {
    phase: "remotion_black_render",
    compositionId: COMPOSITION_ID,
    outputVideoPath,
    workDir,
    title,
  };
}
