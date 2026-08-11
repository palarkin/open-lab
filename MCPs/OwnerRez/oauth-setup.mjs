// Exchange an OwnerRez OAuth temp code (tc_...) for a permanent access token (at_...),
// then write it into .env. Run locally — your client secret never leaves your machine.
//
// Usage:  node oauth-setup.mjs <client_id> <client_secret> <tc_code> <redirect_url>
//
// Get <tc_code>: open the authorize URL in your browser, approve, and copy the value after
// "code=" from the address bar (your redirect page itself doesn't need to load).
import { readFileSync, writeFileSync } from "node:fs";

const [clientId, clientSecret, code, redirect] = process.argv.slice(2);
const REDIRECT = redirect; // must match the app's OAuth Redirect URL exactly (e.g. https://your-site.com/callback/)
if (!clientId || !clientSecret || !code || !REDIRECT) {
  console.error("Usage: node oauth-setup.mjs <client_id> <client_secret> <tc_code> <redirect_url>");
  process.exit(1);
}

const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT });
const res = await fetch("https://api.ownerrez.com/oauth/access_token", {
  method: "POST",
  headers: {
    Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body,
});
const data = await res.json().catch(() => ({}));
if (!res.ok || !data.access_token) {
  console.error(`❌ Exchange failed (${res.status}):`, JSON.stringify(data));
  console.error("Common cause: the tc_ code expired (10-min limit) or was already used — re-authorize for a fresh one.");
  process.exit(1);
}

const token = data.access_token;
const ua = `Claude MCP/1.0 (${clientId})`;

// Upsert the two keys into .env (replace existing lines, else append).
const envPath = new URL(".env", import.meta.url);
let lines = readFileSync(envPath, "utf8").split("\n");
const upsert = (key, val) => {
  const line = `${key}=${val}`;
  const i = lines.findIndex((l) => l.trim().startsWith(key + "="));
  if (i >= 0) lines[i] = line; else lines.push(line);
};
upsert("OWNERREZ_OAUTH_TOKEN", token);
upsert("OWNERREZ_APP_UA", ua);
writeFileSync(envPath, lines.join("\n"));

console.log(`✅ Access token obtained and written to .env`);
console.log(`   user: ${data.user_display_name ?? data.user_id}  scope: ${data.scope}`);
console.log(`   OWNERREZ_APP_UA = ${ua}`);
console.log(`Now restart Claude Code — messaging will be live.`);
