import axios, { AxiosInstance, AxiosError } from "axios";
import { normalizeNextUrl } from "../logic.js";

const BASE_URL = "https://api.ownerrez.com/v2";
// Legacy host — same Basic auth. Home of a few things the documented v2 API doesn't expose,
// e.g. genuine owner statements (GET /ownerstatements). Undocumented: treat as best-effort.
const LEGACY_URL = "https://app.ownerrez.com/api";

// Auth resolution: prefer an OAuth-app token (Bearer + User-Agent) if present — needed for
// messaging — otherwise fall back to the Personal Access Token via HTTP Basic (email + pt_ token).
const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };
// preferBasic=true for the legacy host (statements verified under the PAT). The v2 client prefers
// the OAuth token when present, since messaging requires it; both fall back to whichever exists.
function authOpts(preferBasic = false) {
  const oauth = process.env.OWNERREZ_OAUTH_TOKEN;
  const email = process.env.OWNERREZ_EMAIL;
  const token = process.env.OWNERREZ_TOKEN;
  const basic = email && token ? { auth: { username: email, password: token }, headers: { ...JSON_HEADERS } } : null;
  const bearer = oauth ? { headers: { ...JSON_HEADERS, Authorization: `Bearer ${oauth}`, "User-Agent": process.env.OWNERREZ_APP_UA || "ownerrez-mcp/1.0" } } : null;
  const chosen = preferBasic ? basic ?? bearer : bearer ?? basic;
  if (!chosen) throw new Error("Set OWNERREZ_OAUTH_TOKEN, or OWNERREZ_EMAIL + OWNERREZ_TOKEN.");
  return chosen;
}

// Lazy singletons — built on first request, so .env can be loaded by the entrypoint before this
// runs (avoids ESM import-order pitfalls).
let _client: AxiosInstance | null = null;
function client(): AxiosInstance {
  if (_client) return _client;
  _client = axios.create({ baseURL: BASE_URL, timeout: 30000, ...authOpts() });
  return _client;
}

let _legacy: AxiosInstance | null = null;
function legacyClient(): AxiosInstance {
  if (_legacy) return _legacy;
  _legacy = axios.create({ baseURL: LEGACY_URL, timeout: 30000, ...authOpts(true) });
  return _legacy;
}

// Cached property list + id→name map. Properties change rarely; caching cuts the common
// "list properties then query bookings" round-trips and eases rate-limit pressure.
let _props: any[] | null = null;
let _propsAt = 0;
export async function getPropertiesCached(ttlMs = 300000): Promise<{ items: any[]; nameById: Map<number, string> }> {
  if (!_props || Date.now() - _propsAt > ttlMs) {
    _props = await orPaged<any>("/properties", { active: true });
    _propsAt = Date.now();
  }
  return { items: _props, nameById: new Map(_props.map((p) => [p.id, p.name])) };
}

// Best-effort GET against the legacy host. Undocumented endpoints — callers must handle failure.
export async function orLegacyGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await legacyClient().request<T>({ method: "get", url: path, params });
  return res.data;
}

export async function orRequest<T>(
  method: "get" | "post" | "patch" | "delete",
  path: string,
  options: { params?: Record<string, unknown>; data?: unknown } = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const res = await client().request<T>({ method, url: path, ...options });
      return res.data;
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 429 && attempt < 3) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        attempt++;
        continue;
      }
      if (e.response) {
        // OwnerRez errors: { messages, code, doc_url, status, status_code }. Surface stable `code` + messages.
        const b = e.response.data as any;
        const detail = b?.code
          ? `${b.code}: ${Array.isArray(b?.messages) ? b.messages.join("; ") : b?.messages ?? b?.error ?? ""}`
          : JSON.stringify(b);
        throw new Error(`OwnerRez API ${e.response.status} (${path}) ${detail}`);
      }
      if (e.request) throw new Error(`OwnerRez network error (${path}): no response`);
      throw err;
    }
  }
}

// Two envelope shapes exist: cursor-style (bookings/payments: next_page_url) and
// list-style (owners/properties: count). Both expose `items` — page until exhausted.
// ponytail: sequential paging; fine for one account. Parallelize only if pages get large.
export async function orPaged<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const out: T[] = [];
  let page = await orRequest<any>("get", path, { params });
  out.push(...(page.items ?? []));
  while (page.next_page_url) {
    page = await orRequest<any>("get", normalizeNextUrl(page.next_page_url));
    out.push(...(page.items ?? []));
  }
  return out;
}

export const formatResponse = (d: unknown) => JSON.stringify(d, null, 2);
export const handleError = (e: unknown) => `Error: ${e instanceof Error ? e.message : String(e)}`;
