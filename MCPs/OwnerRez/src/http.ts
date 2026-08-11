// REMOTE entry point — HTTP transport for cloud hosting (phone access via a Claude custom connector).
// STATUS: scaffold, deploy-ready but NOT yet deployed or runtime-verified. The local stdio server
// (index.ts) is the one in use today. Do not expose this without the auth token set.
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), quiet: true });

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server.js";

// Required config. Refuse to start without OwnerRez creds AND an auth token — this server is
// internet-exposed and holds a write-capable OwnerRez token, so unauthenticated access is unsafe.
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const PORT = Number(process.env.PORT ?? 8080);
const MCP_PATH = "/mcp";
if (!process.env.OWNERREZ_EMAIL || !process.env.OWNERREZ_TOKEN) {
  console.error("Missing OWNERREZ_EMAIL / OWNERREZ_TOKEN.");
  process.exit(1);
}
if (!AUTH_TOKEN) {
  console.error("Missing MCP_AUTH_TOKEN — refusing to start an unauthenticated internet-facing server.");
  process.exit(1);
}

function unauthorized(res: ServerResponse) {
  res.writeHead(401, { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" });
  res.end(JSON.stringify({ error: "unauthorized" }));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

const httpServer = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.url?.split("?")[0] !== MCP_PATH) {
      res.writeHead(404);
      return res.end();
    }
    // Bearer-token gate.
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${AUTH_TOKEN}`) return unauthorized(res);

    // Stateless: a fresh server + transport per request avoids cross-request state/id collisions.
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); });
    await buildServer().connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  }
});

httpServer.listen(PORT, () => console.error(`ownerrez-mcp-server (HTTP) on :${PORT}${MCP_PATH}`));
