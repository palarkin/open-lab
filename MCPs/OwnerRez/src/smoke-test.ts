// Post-build smoke test: confirms auth + a couple of read endpoints. Run: npm test
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

import { orRequest, orPaged } from "./services/ownerrez-client.js";

const me = await orRequest<any>("get", "/users/me");
console.log(`✅ Auth OK — ${me.company_name ?? me.email_address}`);

const props = await orPaged<any>("/properties");
console.log(`✅ Properties: ${props.length}`);

const owners = await orPaged<any>("/owners");
console.log(`✅ Owners: ${owners.length}`);
console.log("Smoke test passed.");
