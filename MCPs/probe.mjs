// Zero-dependency live check. Run AFTER pasting creds into .env:  node probe.mjs
// Uses Node's native fetch (Node 18+) — no npm install needed.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL(".env", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).split("#")[0].trim()];
    })
);

const email = env.OWNERREZ_EMAIL, token = env.OWNERREZ_TOKEN;
if (!email || !token) { console.error("❌ Fill OWNERREZ_EMAIL and OWNERREZ_TOKEN in .env first."); process.exit(1); }

const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
const get = async (path) => {
  const res = await fetch(`https://api.ownerrez.com/v2${path}`, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}: ${await res.text()}`);
  return res.json();
};

try {
  const me = await get("/users/me");
  console.log(`✅ Auth OK — logged in as: ${me.email ?? me.name ?? JSON.stringify(me).slice(0, 120)}`);

  const props = await get("/properties");
  const items = props.items ?? [];
  const withOwner = items.filter((p) => p.owner_id).length;
  console.log(`✅ Properties: ${props.count ?? items.length} total; ${withOwner}/${items.length} on this page have an owner_id.`);

  const owners = await get("/owners");
  console.log(`✅ Owners: ${owners.count ?? (owners.items ?? []).length} total — statement synthesizer inputs are live.`);
} catch (e) {
  console.error("❌ " + e.message);
  process.exit(1);
}
