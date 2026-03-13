import http from "node:http";
import { runBrainrotTranscriptAudioJob } from "./brainrot_transcript_audio.mjs";
import { createProgressReporter, sleep } from "./job_callbacks.mjs";
import { startMiniMaxAssetWarmup } from "./minimax_voice_registry.mjs";
import { runBrainrotLambdaRenderJob } from "./remotion_brainrot_lambda_render.mjs";
import { runRemotionBrainrotRenderJob } from "./remotion_brainrot_render.mjs";
import { runRemotionBlackRenderJob } from "./remotion_black_render.mjs";

const port = Number(process.env.REMOTION_PROXY_PORT || "8765");
const startedAt = Date.now();

void startMiniMaxAssetWarmup().catch(() => {});

/**
 * @param {import("node:http").ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} payload
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    /** @param {Buffer | string} chunk */
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

/**
 * @param {Record<string, unknown>} body
 */
async function runStubRender(body) {
  const hasCallbackUrl = typeof body.callback_url === "string";
  const reportProgress = createProgressReporter({
    callbackUrl: hasCallbackUrl ? String(body.callback_url) : null,
    callbackHeaders:
      body.callback_headers &&
      typeof body.callback_headers === "object" &&
      !Array.isArray(body.callback_headers)
        ? /** @type {Record<string, string>} */ (body.callback_headers)
        : {},
  });

  const stepDelaySeconds =
    typeof body.step_delay_seconds === "number" ? body.step_delay_seconds : 5;
  /** @type {Array<[string, number]>} */
  const steps = [
    ["Accepted fal smoke test job", 8],
    ["Booting local renderer bridge", 24],
    ["Pretending to render frames", 57],
    ["Uploading dummy output", 84],
  ];

  for (const [status, progress] of steps) {
    await reportProgress(status, progress);
    if (hasCallbackUrl) {
      await sleep(stepDelaySeconds * 1000);
    }
  }

  if (hasCallbackUrl && typeof body.final_url === "string") {
    await reportProgress("COMPLETED", 100, {
      url: body.final_url,
    });
  }

  return {
    ok: true,
    echoedInput: {
      job_id: body.job_id,
      composition_id: body.composition_id,
      props: body.props ?? {},
    },
    nodePid: process.pid,
    renderedAt: new Date().toISOString(),
    note: "Stub response from the local Node renderer process.",
  };
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    sendJson(res, 200, {
      ok: true,
      pid: process.pid,
      uptimeMs: Date.now() - startedAt,
      nodeVersion: process.version,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/render") {
    try {
      const body = await readJsonBody(req);
      const props =
        body.props && typeof body.props === "object" && !Array.isArray(body.props)
          ? /** @type {Record<string, unknown>} */ (body.props)
          : {};

      if (props.pipeline === "brainrot_transcript_audio") {
        const reportProgress = createProgressReporter({
          callbackUrl:
            typeof body.callback_url === "string" ? body.callback_url : null,
          callbackHeaders:
            body.callback_headers &&
            typeof body.callback_headers === "object" &&
            !Array.isArray(body.callback_headers)
              ? /** @type {Record<string, string>} */ (body.callback_headers)
              : {},
        });
        const result = await runBrainrotTranscriptAudioJob({
          jobId: String(body.job_id ?? "job"),
          props,
          reportProgress,
        });

        sendJson(res, 200, {
          ok: true,
          nodePid: process.pid,
          renderedAt: new Date().toISOString(),
          ...result,
        });
        return;
      }

      if (props.pipeline === "remotion_black_render") {
        const reportProgress = createProgressReporter({
          callbackUrl:
            typeof body.callback_url === "string" ? body.callback_url : null,
          callbackHeaders:
            body.callback_headers &&
            typeof body.callback_headers === "object" &&
            !Array.isArray(body.callback_headers)
              ? /** @type {Record<string, string>} */ (body.callback_headers)
              : {},
        });
        const result = await runRemotionBlackRenderJob({
          jobId: String(body.job_id ?? "job"),
          props,
          reportProgress,
        });

        sendJson(res, 200, {
          ok: true,
          nodePid: process.pid,
          renderedAt: new Date().toISOString(),
          ...result,
        });
        return;
      }

      if (props.pipeline === "brainrot_remotion_render") {
        const reportProgress = createProgressReporter({
          callbackUrl:
            typeof body.callback_url === "string" ? body.callback_url : null,
          callbackHeaders:
            body.callback_headers &&
            typeof body.callback_headers === "object" &&
            !Array.isArray(body.callback_headers)
              ? /** @type {Record<string, string>} */ (body.callback_headers)
              : {},
        });
        const result = await runRemotionBrainrotRenderJob({
          jobId: String(body.job_id ?? "job"),
          props,
          reportProgress,
        });

        sendJson(res, 200, {
          ok: true,
          nodePid: process.pid,
          renderedAt: new Date().toISOString(),
          ...result,
        });
        return;
      }

      if (props.pipeline === "brainrot_lambda_render") {
        const reportProgress = createProgressReporter({
          callbackUrl:
            typeof body.callback_url === "string" ? body.callback_url : null,
          callbackHeaders:
            body.callback_headers &&
            typeof body.callback_headers === "object" &&
            !Array.isArray(body.callback_headers)
              ? /** @type {Record<string, string>} */ (body.callback_headers)
              : {},
        });
        const result = await runBrainrotLambdaRenderJob({
          jobId: String(body.job_id ?? "job"),
          props,
          reportProgress,
        });

        sendJson(res, 200, {
          ok: true,
          nodePid: process.pid,
          renderedAt: new Date().toISOString(),
          ...result,
        });
        return;
      }

      sendJson(res, 200, await runStubRender(body));
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid JSON body",
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`remotion proxy spike node server listening on ${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
