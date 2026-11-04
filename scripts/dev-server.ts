import { createServer as createHttpServer, IncomingMessage } from "node:http";
import { handleMCPRequest } from "../src/server.js";

const PORT = Number(process.env.PORT || 8787);

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const method = req.method || "GET";

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) for (const x of v) headers.append(k, x);
      else headers.set(k, String(v));
    }

    const rawBody = method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : await readBody(req);
    const body = rawBody ? new Uint8Array(rawBody) : undefined;
    const webReq = new Request(url.toString(), { method, headers, body });

    const resp = await handleMCPRequest(webReq);

    res.statusCode = resp.status;
    resp.headers.forEach((v, k) => res.setHeader(k, v));
    if (resp.body) {
      const reader = resp.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal error");
  }
});

server.listen(PORT, () => {
  console.log(`MCP backend (unauthenticated, stateless) listening on http://localhost:${PORT}/mcp`);
});
