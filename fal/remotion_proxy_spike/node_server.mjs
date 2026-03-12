import http from "node:http";

const port = Number(process.env.REMOTION_PROXY_PORT || "8765");
const startedAt = Date.now();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

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
      sendJson(res, 200, {
        ok: true,
        echoedInput: body,
        nodePid: process.pid,
        renderedAt: new Date().toISOString(),
        note: "Stub response from the local Node renderer process.",
      });
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
