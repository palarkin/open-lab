# OwnerRez MCP Server — Architecture & Design

A reference for how this MCP server is built: its structure, the auth model, the OwnerRez API
behaviors it accounts for, and the tools it exposes.

## Overview

The server is an [MCP](https://modelcontextprotocol.io) bridge between an AI client and the
OwnerRez API. An MCP client (Claude Desktop/Code, or any MCP-compatible client) talks to the server
over **stdio** locally — or **HTTP** when hosted remotely — and the server talks to OwnerRez over
HTTPS.

```
MCP client  ⇄  (MCP JSON-RPC: stdio or HTTP)  ⇄  this server  ⇄  (HTTPS)  ⇄  OwnerRez API v2
```

The tool logic is defined once and shared by both transports, so the local and remote servers
always expose the same capabilities.

## Project layout

```
├── package.json, tsconfig.json
├── .env / .env.example        # credentials (.env is gitignored)
├── probe.mjs                  # zero-dependency live auth check
├── oauth-setup.mjs            # OAuth code→token exchange helper
└── src/
    ├── index.ts               # local entry point (stdio transport)
    ├── http.ts                # remote entry point (HTTP transport + bearer auth)
    ├── server.ts              # shared tool/prompt registration (buildServer)
    ├── logic.ts               # pure, network-free logic (unit-tested)
    ├── logic.test.ts          # unit tests
    ├── smoke-test.ts          # live API smoke test
    ├── services/ownerrez-client.ts   # auth + HTTP engine + pagination
    └── tools/                 # one file per resource area + prompts.ts
```

## Authentication

OwnerRez uses **HTTP Basic** auth on the v2 API: the username is the account email and the password
is a Personal Access Token (`pt_…`), created under Settings → Advanced Tools → Developer/API
Settings. This covers every read and write operation **except messaging**.

Messaging endpoints require an **OAuth-app token** (`at_…`, sent as a Bearer token with a
`User-Agent` header) — a Personal Access Token returns `402 messaging_not_enabled`. The server
resolves auth automatically: it uses the OAuth token when one is configured, otherwise the Personal
Access Token. The legacy owner-statements endpoint always uses the Personal Access Token.

```
OWNERREZ_EMAIL=            # required — account email
OWNERREZ_TOKEN=            # required — pt_ token
OWNERREZ_OAUTH_TOKEN=      # optional — at_ token; enables messaging
OWNERREZ_APP_UA=           # optional — User-Agent for OAuth, e.g. "My App/1.0 (c_12345)"
```

## OwnerRez API notes

Behaviors the client and tools account for:

- **Base URL:** `https://api.ownerrez.com/v2`.
- **Pagination — two envelope shapes.** List endpoints return either a cursor-style page
  (`items` + `next_page_url`) or a count-style page (`items` + `count`). The client pages until
  exhausted; when following `next_page_url` it strips the origin and a leading `/v2` so the base URL
  isn't doubled.
- **Rate limiting:** 300 requests per 5 minutes per IP. Over the limit, requests return `429`; the
  client backs off exponentially and retries.
- **Error format:** errors are JSON with a stable, snake_case `code` plus `messages`, `doc_url`,
  `status`, and `status_code`. Integrations should branch on `code`, not human-readable text.
- **Bookings queries require a scope:** `GET /v2/bookings` needs either `property_ids` or
  `since_utc`. Account-wide queries fetch the property list first, then query across those ids.
- **Messaging:** `GET /v2/messages` uses a camelCase `threadId` parameter (unlike the snake_case
  rest of v2). There is no "list all threads" endpoint — thread ids come from inquiries
  (`GET /v2/inquiries` returns `thread_ids`). Messaging requires the OAuth token (see above).
- **Owner statements:** the documented v2 API has no owner-statement resource. Official statements
  are available on the legacy host at `GET https://app.ownerrez.com/api/ownerstatements/{id}`
  (list an owner's statements via `?ownerId=`). This is undocumented, so the statement tool treats
  it as best-effort and falls back to a synthesized estimate built from booking charges.
- **Booking creation** is not available through this API (it requires the Channel API), so the
  tools are read + rate/message writes, not booking creation.
- **No tasks/maintenance resource** exists in the API.

## Tools

Read tools return a compact view by default; pass `full: true` for every field and `limit` to cap
results. Write tools change nothing unless called with `confirm: true` (they return a preview
otherwise).

| Area | Tools |
|------|-------|
| Properties | `list_properties`, `get_property`, `search_available_properties` |
| Bookings | `list_bookings`, `get_booking`, `get_schedule` (arrivals / departures / turnovers), `update_booking` *(write)* |
| Owners & statements | `list_owners`, `get_owner`, `list_owner_statements`, `get_owner_statement` (official first, synthesized fallback) |
| Guests | `search_guests`, `get_guest`, `create_guest` *(write)*, `update_guest` *(write)* |
| Inquiries (leads) | `list_inquiries`, `get_inquiry` (carry `thread_ids` — the entry point to messaging) |
| Quotes | `list_quotes`, `get_quote`, `create_quote` *(write)*, `update_quote` *(write)*, `delete_quote` *(write)* |
| Finance | `list_payments`, `get_payment`, `list_deposits`, `get_deposit`, `list_refunds`, `get_refund` |
| Calendar / rates | `get_availability`, `update_rate` *(write)* |
| Reviews & listings | `list_reviews`, `get_review`, `list_listings`, `list_listing_sites` |
| Pricing config | `list_surcharges`, `list_discounts`, `list_fees` |
| Tags | `list_entity_tags`, `list_tag_definitions`, `tag_entity` *(write)*, `untag_entity` *(write)* |
| Account | `whoami` |
| Messaging *(OAuth)* | `list_thread_messages`, `get_message`, `send_message` *(write)* |

See [`ROADMAP.md`](ROADMAP.md) for the full endpoint→tool coverage table.

## Prompts

Canned workflows the client can invoke directly: `weekly_turnover_briefing`,
`monthly_owner_statement`, `unanswered_inquiries`.

## Owner statement synthesis

When no official statement is available, `get_owner_statement` estimates one from booking charge
lines: it resolves the owner's properties, pulls their bookings with charges for the date range, and
aggregates `owner_amount` and `commission_amount` per property (excluding blocks and canceled
bookings). This estimate ignores owner expenses and groups bookings by stay-date overlap rather than
by OwnerRez's statement rules, so it can differ from an official statement — it is labeled a rough
estimate, and the official endpoint is the source of truth when present.

## Remote / HTTP mode

`src/http.ts` serves the same tools over HTTP (streamable transport) behind a bearer-token gate, for
hosting so a remote MCP client (including mobile and non-Claude clients) can connect by URL. It
requires `MCP_AUTH_TOKEN` and HTTPS in front of it. For an internet-facing deployment holding a
write-capable token, exposing a read-only tool set is recommended.

## Testing

Pure, network-free logic (statement aggregation, schedule bucketing, pagination normalization, date
validation, and error classification) lives in `src/logic.ts` and is unit-tested in
`src/logic.test.ts` (`npm test`). `npm run smoke` runs a live read against the API.

## Security

`.env` is gitignored and never committed. The OAuth `at_` token grants full account access — treat
it like a password, and revoke/reissue it in OwnerRez if it is exposed.
