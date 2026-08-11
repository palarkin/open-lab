# OwnerRez MCP Server

An MCP server that exposes the OwnerRez API v2 (plus genuine owner statements and messaging) to
Claude — over stdio locally, or HTTP for remote/hosted use. 21 tools + 3 canned prompts.

Full design/decision record: [`BLUEPRINT.md`](BLUEPRINT.md).

## Setup

1. **Get a Personal Access Token** — OwnerRez → Settings → Advanced Tools → Developer/API Settings.
   Starts with `pt_`.
2. Copy `.env.example` → `.env` and fill in `OWNERREZ_EMAIL` + `OWNERREZ_TOKEN`.
3. Live sanity check (no build needed): `node probe.mjs`
4. Build and register with Claude Code:
   ```bash
   npm install && npm run build
   claude mcp add ownerrez --scope user -- node /absolute/path/to/ownerrez-mcp/dist/index.js
   ```
   Fully quit and reopen Claude Code to load it.

## Auth modes

The client picks auth automatically:

- **Personal Access Token (default)** — HTTP Basic, username = OwnerRez email, password = `pt_` token.
  Covers everything **except messaging**.
- **OAuth-app token (optional)** — set `OWNERREZ_OAUTH_TOKEN` (`at_…`) + `OWNERREZ_APP_UA`. Used
  instead of the PAT for API calls, and **required for messaging** (PATs get `402 messaging_not_enabled`).
  Create an OAuth app + "Grant Access To Me", then exchange the code with `node oauth-setup.mjs`.
  The legacy owner-statements endpoint always prefers the PAT.

## Tools (21)

**Properties** — `list_properties`, `get_property`
**Bookings** — `list_bookings`, `get_booking`, `get_schedule` (arrivals/departures/turnovers for a range)
**Owners & statements** — `list_owners`, `get_owner`, `list_owner_statements` (official), `get_owner_statement` (official-first, synthesizes as fallback)
**Guests** — `search_guests`, `get_guest`
**Inquiries (leads)** — `list_inquiries`, `get_inquiry` (carry `thread_ids` → the door to messaging)
**Finance** — `list_payments`, `list_deposits`, `list_refunds`
**Calendar / rates** — `get_availability`, `update_rate` *(write, `confirm`-gated)*
**Messaging** *(OAuth only)* — `list_thread_messages`, `get_message`, `send_message` *(write, `confirm`-gated)*

Read tools return a compact view by default; pass `full: true` for every field, `limit` to cap.
Write tools change nothing unless called with `confirm: true`.

## Prompts (3)

`weekly_turnover_briefing`, `monthly_owner_statement`, `unanswered_inquiries` — one-click workflows.

## Remote / HTTP mode (scaffolded)

`src/http.ts` serves the same tools over HTTP with a bearer-token gate, for cloud hosting so a
Claude custom connector (incl. mobile) can reach it. Requires `MCP_AUTH_TOKEN`; run with
`npm run start:http`. Not yet deployed — see BLUEPRINT.

## Development

```bash
npm run build     # tsc → dist/
npm test          # build + unit tests (pure logic in src/logic.ts)
npm run smoke     # live API smoke test (needs .env)
npm run dev       # run stdio server via tsx (no build)
```

Pure, network-free logic lives in `src/logic.ts` and is unit-tested in `src/logic.test.ts`
(statement aggregation, schedule bucketing, pagination normalization, date validation).

## Security

`.env` is gitignored — never commit it. The OAuth `at_` token grants full account access; treat it
like a password, and revoke/reissue in OwnerRez if it leaks.
