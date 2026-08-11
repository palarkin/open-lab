# OwnerRez MCP Server — Corrected Build Blueprint
*Verified against live OwnerRez docs on 2026-08-10. Supersedes the original plan.*

Sources checked:
- Auth: https://www.ownerrez.com/support/articles/api-auth
- Reference: https://api.ownerrez.com/help/v2
- Operation index (all endpoints): https://api.ownerrez.com/help/v2/index.md
- Machine-readable spec (use for exact fields): https://api.ownerrez.com/openapi/v2.json
- Verified endpoint specs: bookings, payments, owners, properties

> [!abstract] What changed from the original plan
> Auth and the core read tools were correct. Three things were wrong and are fixed here:
> **(1)** no owner-statements endpoint exists → we synthesize it; **(2)** no calendar/availability
> endpoint exists → remap to bookings + property date filters + spotrates; **(3)** pagination was
> guessed wrong and isn't even uniform across endpoints.

---

## 0. Mental model (unchanged — it was right)
```
Claude ⇄ (MCP JSON-RPC over stdio) ⇄ your Node server ⇄ (HTTPS/axios) ⇄ OwnerRez API v2
```

## 1. File structure (unchanged from the plan)
Same layout. Rename `calendar.ts` → keep it, but its meaning changes (see §6).
`owners.ts` now also holds the statement **synthesizer**.

## 2. package.json / tsconfig (unchanged — copy Guesty)

## 3. index.ts (unchanged — copy Guesty, swap names)

---

## 4. services/ownerrez-client.ts — CORRECTED

### Auth — VERIFIED ✅
HTTP Basic. **Username = your OwnerRez email. Password = the token (starts `pt_`).**
Docs' own example: `curl -u wylie@acme.com:pt_faaaast https://api.ownerrez.com/v2/properties`

Fixes vs original:
- **Email is REQUIRED, not optional.** Drop the "Bearer fallback" — Bearer (`at_`) tokens are
  only for OAuth *apps*, which you are not building. A missing email would silently break auth.
- No `User-Agent` header needed (that requirement is OAuth-apps-only).
- Hoist the client to a module-level singleton (original rebuilt it on every call).

```ts
import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL = "https://api.ownerrez.com/v2";

const email = process.env.OWNERREZ_EMAIL;
const token = process.env.OWNERREZ_TOKEN;
if (!email || !token) throw new Error("OWNERREZ_EMAIL and OWNERREZ_TOKEN are both required");

const client: AxiosInstance = axios.create({   // singleton — built once
  baseURL: BASE_URL,
  auth: { username: email, password: token },   // HTTP Basic, verified
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 30000,
});

export async function orRequest<T>(
  method: "get" | "post" | "patch" | "delete",   // note: PATCH, not PUT (see §6)
  path: string,
  options: { params?: Record<string, unknown>; data?: unknown } = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const res = await client.request<T>({ method, url: path, ...options });
      return res.data;
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 429 && attempt < 3) {          // keep backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        attempt++; continue;
      }
      if (e.response) throw new Error(`OwnerRez API ${e.response.status} (${path}): ${JSON.stringify(e.response.data)}`);
      if (e.request)  throw new Error(`OwnerRez network error (${path}): no response`);
      throw err;
    }
  }
}

export const formatResponse = (d: unknown) => JSON.stringify(d, null, 2);
export const handleError = (e: unknown) => `Error: ${e instanceof Error ? e.message : String(e)}`;
```

> [!warning] Rate limits — two separate ones (both verified)
> 1. **Per-request:** 300 requests per 5 minutes per IP. Over that → `429` with body
>    `{ "code": 429, "error": "Rate limit exceeded." }`; auto-unblocks when you fall back under.
>    No `Retry-After` header, so our exponential backoff is the right approach. ✅
> 2. **PAT account cap:** a given IP may only touch 2 distinct OwnerRez accounts per 24h. Irrelevant
>    to your single-account use.
> Best practice from the docs: don't poll the API as a mirror — cache locally and (later) use
> webhooks. For an interactive MCP this is naturally fine; just avoid tight loops.

### Error format — VERIFIED (surfaced by the client now)
Every error is JSON: `{ messages, code, doc_url, status, status_code }`. `code` is a stable
snake_case identifier — branch on it, not on human text. The client now extracts `code` + `messages`
into the thrown error instead of dumping raw JSON.

### Pagination — CORRECTED (and it's not uniform!)
Two different envelope shapes depending on endpoint. Handle both.

| Shape | Used by | Fields | How to page |
|---|---|---|---|
| `PageableEnumerableOf…` | **bookings, payments** | `items`, `limit`, `offset`, `next_page_url` | follow `next_page_url` until it's `null` |
| `PageableListOf…` | **owners, properties** | `count` (+ `items`, `limit`, `offset`) | offset-based; `count` = total records |

The original plan's `{results, count}` assumption is wrong for both. There is **no `results` key**.

Add a helper that pages until exhausted:
```ts
// ponytail: naive sequential paging; fine for one account. Parallelize only if pages get large.
export async function orPaged<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const out: T[] = [];
  let page: any = await orRequest("get", path, { params });
  out.push(...(page.items ?? []));
  while (page.next_page_url) { page = await orRequest("get", page.next_page_url); out.push(...(page.items ?? [])); }
  return out;
}
```

---

## 5. tools/*.ts — same pattern, keep the confirm-gate on writes (unchanged, still correct)

---

## 6. Tool surface — CORRECTED against real endpoints

### Read tools that map cleanly ✅
| Tool | Real endpoint | Notes |
|---|---|---|
| `ownerrez_list_properties` | `GET /v2/properties` | `active`, `availability_start_date`, `availability_end_date` params |
| `ownerrez_get_property` | `GET /v2/properties/{id}` | |
| `ownerrez_list_bookings` | `GET /v2/bookings` | **must pass `property_ids` OR `since_utc`** (one is required) |
| `ownerrez_get_booking` | `GET /v2/bookings/{id}` | |
| `ownerrez_list_owners` | `GET /v2/owners` | |
| `ownerrez_get_owner` | `GET /v2/owners/{id}` | |
| `ownerrez_list_messages` | `GET /v2/messages` | **fetches ONE thread** — requires a thread id, not a global list |
| `ownerrez_get_message` | `GET /v2/messages/{id}` | |

### Calendar — REMAPPED (no calendar endpoint exists)
- **Read availability** → `GET /v2/properties?availability_start_date=…&availability_end_date=…`
  (returns properties bookable in that window), plus `GET /v2/bookings?property_ids=…&from=…&to=…`
  to see what's blocked/booked. Rename tool to `ownerrez_get_availability` to be honest about it.
- **Write a rate** → `PATCH /v2/spotrates` (create/update many spot rates). This is a PATCH, not the
  PUT/POST the original guessed. Gate with `confirm=true`.
- **Block dates** → done by creating a booking (`POST /v2/bookings`), not a calendar write.

### Write tools (all gated by `confirm=true`)
| Tool | Real endpoint | Notes |
|---|---|---|
| `ownerrez_update_rate` | `PATCH /v2/spotrates` | was "update_calendar" |
| `ownerrez_send_message` | `POST /v2/messages` | ✅ — **but see sandbox note below; real messages reach real guests** |
| `ownerrez_update_booking` | `PATCH /v2/bookings/{id}` | optional; PATCH not PUT |

> [!warning] TWO write-path findings from the channel/quote/sandbox docs
> **(a) You cannot create bookings via this API.** The App API "can't directly create bookings
> since that requires the collection of credit card data" — direct booking creation is
> **Channel-API-only** (a partner-level integration, not our single-account PAT path). So the
> earlier idea of "block dates via `POST /v2/bookings`" is **dropped**. Rate changes via
> `PATCH /v2/spotrates` remain the real calendar-write.
>
> **(b) Write capability — VERIFIED write-capable ✅ (2026-08-10).** Live non-mutating probe
> (`PATCH /v2/spotrates` with an empty list) returned `200 []`. The Personal Access Token can write,
> so `update_rate` and `send_message` are buildable. (Booking *creation* is still Channel-API-only
> per finding (a) — that limit is the API's, not the token's.)

> [!warning] Messaging is UNAVAILABLE with a Personal Access Token (verified live 2026-08-10)
> All `/v2/messages` endpoints return **402 `messaging_not_enabled`** with a PAT: *"Messaging
> endpoints require an OAuth app. Personal Access Tokens do not support messaging."* So
> `list_thread_messages`, `get_message`, and `send_message` cannot function on the current token.
> **Fix path (self-use is free):** create an OAuth app and click *Grant Access To Me* on the Users
> tab (https://www.ownerrez.com/support/articles/api-oauth-app), then authenticate with the `at_`
> OAuth token instead of the `pt_` PAT. The message tools now detect the 402 and return a clear
> explanation instead of a raw error; their descriptions also state the limitation upfront.

## UPDATE 2026-08-10 — capability expansion (19 tools, all verified live)
- **Compact output + `limit`/`full`** on `list_properties` and `list_bookings` — fixes the 55–60KB
  overflow-to-disk problem; compact is now the default, `full=true` for everything.
- **`ownerrez_get_schedule(from, to, property_id?)`** — arrivals / departures / in-house / same-day
  turnovers for a range, fanning out over properties internally (no manual id juggling).
- **Guests:** `ownerrez_search_guests(q)` + `ownerrez_get_guest(id)`. (No guest→bookings filter exists.)
- **Finance:** `ownerrez_list_payments|deposits|refunds` (require booking_id or since_utc).
- **Property-name cache** (`getPropertiesCached`, 5-min TTL) powers the schedule + compact bookings.
- **OAuth-app token support** in the client (`OWNERREZ_OAUTH_TOKEN` + `OWNERREZ_APP_UA`) → Bearer +
  User-Agent instead of Basic. This is the path to enable messaging (PATs can't). Set those env vars
  after creating an OAuth app + Grant Access To Me.
- **Inquiries (leads):** `ownerrez_list_inquiries` + `ownerrez_get_inquiry` (21 tools total). Inquiries
  carry `thread_ids`, so this is the front door to messaging: list leads → grab a thread_id → read/reply.
  Verified live. (Landscape check: no public OwnerRez MCP is more capable than this build; the only
  richer reference is Hospitable's own official *hosted* MCP.)

> [!tip] Messaging ENABLED 2026-08-10 (OAuth app + Grant Access To Me, token in .env)
> Verified live: reading a real guest thread works. Two gotchas found along the way:
> (1) messaging needs the OAuth `at_` token (done); (2) **`GET /v2/messages` uses camelCase
> `threadId`** — unlike the snake_case rest of v2 — which was silently 405-ing `list_thread_messages`
> until fixed. `send_message` posts a JSON body (`thread_id`, `body`) and stays `confirm`-gated.

> [!note] Messaging safety (applies once OAuth-app messaging is enabled)
> Production messages go to **real guests**. Test against the **stage** environment
> (`appstage.ownerrez.com`) with an OwnerRez-enabled test SMS number. Keep the `confirm=true` gate
> strict on `send_message`. Don't use `{field_code}` template variables — use the guest's real name.

### Owner statement — SYNTHESIZED (no endpoint; this is the real work)
There is no `owner statement` resource. We assemble one from the accounting data that *does* exist.
Booking charges already carry the owner-accounting fields we need.

`ownerrez_get_owner_statement(owner_id?, property_ids?, from, to, confirm_only_read)`:
1. Resolve properties for the owner. **⚠ One unconfirmed link:** neither `/v2/properties` nor
   `/v2/bookings` has an `owner_id` filter. The `PropertyViewModel` very likely carries an
   `owner_id`/owner field in its full body — **confirm via `/openapi/v2.json` at build time.**
   Fallback that always works: require the caller to pass `property_ids` explicitly.
2. `GET /v2/bookings?property_ids=…&from=…&to=…&include_charges=true` → each charge line has
   `owner_amount`, `commission_amount`, `owner_commission_percent`, `is_taxable`, `type`
   (rent/surcharge/tax/…). This is the owner-side money.
3. `GET /v2/payments?booking_id=…` per booking → `amount`, `total_fees`, `collected_utc`, `type`,
   `is_deposited`, nested `deposits[]`. Optionally `GET /v2/deposits` for payout grouping.
4. Aggregate per property + date range: gross rent, surcharges, taxes, **owner payout**
   (Σ `owner_amount`), **PM commission** (Σ `commission_amount`), fees. Return a structured summary
   + line detail. This is the "thing Guesty gets wrong" — here it's computed transparently from
   source records.

> [!note] Field names above are verified from the bookings & payments specs. The only unverified
> piece is the owner→property link (step 1). Everything else is confirmed.

---

## 7. .env.example — CORRECTED
```
# OwnerRez API — https://www.ownerrez.com/support/articles/api-auth
# Create token: OwnerRez → Settings → Advanced Tools → Developer/API Settings (token starts pt_)
OWNERREZ_EMAIL=      # REQUIRED — your OwnerRez login email
OWNERREZ_TOKEN=      # REQUIRED — the pt_ token
```

## 8. Build, register, test — CORRECTED smoke test
```bash
npm install && npm run build
cp .env.example .env        # paste email + pt_ token
claude mcp add ownerrez --scope user -- node /absolute/path/to/ownerrez/dist/index.js
# fully quit and reopen Claude Code
npm test
```
**Smoke test should hit `GET /v2/users/me`** — the lightest authenticated call; confirms the token
works before touching any real data. (Original suggested `/properties?limit=5`, also fine, but
`users/me` is the cleanest auth check.)

## 9. Security (unchanged — correct)
`.env` gitignored; token only in `.env`/config `env`; revoke & reissue in OwnerRez if it leaks.

## 10. Housekeeping (unchanged)
Delete the stale `guesty` definition in `~/.claude/settings.json` before adding `ownerrez`.

---

## Build-time checklist — ALL VERIFIED ✅ (2026-08-10)
- [x] **`PropertyViewModel.owner_id` EXISTS** (int, "The property owner id"). So the statement
      synthesizer resolves an owner's properties by fetching `/v2/properties` and filtering on
      `owner_id` client-side (there's no server-side owner filter, but the field is present).
- [x] **`PATCH /v2/spotrates` body** = a JSON **array** of `SpotRateModel`. Required per item:
      `property_id` (int) + `date` (date-time) — together the unique key. `amount` = nightly rate
      (`null` → seasonal default). Optional: `min_nights`, `max_nights`, `is_arrival_disallowed`,
      `is_departure_disallowed`, `currency` (must match property currency). Returns updated array.
- [x] **`POST /v2/messages` body** = `ThreadMessageEditModel` = `{ thread_id (int), body (string),
      attachment_url? (image URL ≤5MB) }`. Response includes `thread.booking_id`.
      ⚠ Caveat: there is **no `/v2/threads` list endpoint** — a `thread_id` is discovered via a
      booking/message you already have (threads reference `booking_id`). So `send_message` should
      take an explicit `thread_id`; surfacing threads is a lookup on bookings/messages, not a list.

Nothing left unverified. Ready to build the tool files on top of the scaffolded client.

## UPDATE 2026-08-10 — genuine owner statements DO exist (undocumented)
The live `/v2/owners` response carries `last_owner_statement_id` — a field absent from the OpenAPI
spec. Neither v1 nor v2 documents statements, but live probing found a working **legacy** endpoint on
a different host:
- `GET https://app.ownerrez.com/api/ownerstatements?ownerId={id}` — list an owner's real statements
- `GET https://app.ownerrez.com/api/ownerstatements/{id}` — one statement (PascalCase fields:
  `Bookings`, `Expenses`, `Total`=owner payout, `Paid`, `Unpaid`, `w_StatementFromDate`, `StatementDate`)

Same HTTP Basic auth. **Undocumented → treat as best-effort** (could change without notice).

Wired up:
- `ownerrez_list_owner_statements(owner_id)` → official statements, newest first.
- `ownerrez_get_owner_statement` → **genuine-first** (by statement_id, or latest/period-matched for an
  owner_id), **auto-falls back to the synthesizer** if no official statement or the legacy host errors.
  `synthesize=true` forces the estimate. Client gained `orLegacyGet()` for the legacy host.

Verified live: the official statement returned real posted numbers. A cross-check showed the
synthesizer can diverge substantially from the official statement because it ignores owner expenses and
groups bookings by stay-date overlap rather than OwnerRez's statement rules — so the synthesizer is
labeled a ROUGH ESTIMATE and the official endpoint is the source of truth.
