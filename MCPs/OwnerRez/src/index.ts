// LOCAL entry point — stdio transport. This is the one Claude Code launches. Working & in use.
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// quiet: true — dotenv's banner would otherwise pollute stdout, which must carry only JSON-RPC.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), quiet: true });

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

if (!process.env.OWNERREZ_EMAIL || !process.env.OWNERREZ_TOKEN) {
  console.error("Missing OWNERREZ_EMAIL / OWNERREZ_TOKEN. Set them in .env (see .env.example).");
  process.exit(1);
}

await buildServer().connect(new StdioServerTransport());
console.error("ownerrez-mcp-server running on stdio");
