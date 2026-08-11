// Shared helpers for tool files: annotations, a robust list fetcher, and quick read-tool registrars.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, formatResponse, handleError } from "../services/ownerrez-client.js";
import { normalizeNextUrl } from "../logic.js";

export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };

// Handles all response shapes: a pageable envelope ({items,next_page_url}), a bare array, or a single object.
export async function listAny<T = any>(path: string, params: Record<string, unknown> = {}): Promise<any> {
  const first = await orRequest<any>("get", path, { params });
  if (Array.isArray(first)) return first;
  if (first && Array.isArray(first.items)) {
    const out = [...first.items];
    let page = first;
    while (page.next_page_url) {
      page = await orRequest<any>("get", normalizeNextUrl(page.next_page_url));
      out.push(...(page.items ?? []));
    }
    return out;
  }
  return first;
}

// Register a simple read tool that forwards its params to `path` and returns the (paged) result.
export function registerReadList(
  server: McpServer,
  opts: { name: string; title: string; description: string; path: string; inputSchema: Record<string, any> }
) {
  server.registerTool(opts.name, { title: opts.title, description: opts.description, inputSchema: opts.inputSchema, annotations: READ }, async (params: any) => {
    try {
      const data = await listAny(opts.path, params);
      const payload = Array.isArray(data) ? { count: data.length, items: data } : data;
      return { content: [{ type: "text", text: formatResponse(payload) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleError(e) }] };
    }
  });
}

// Register a fetch-by-id read tool for `path`/{id}.
export function registerReadById(server: McpServer, opts: { name: string; title: string; description: string; path: string }) {
  server.registerTool(opts.name, { title: opts.title, description: opts.description, inputSchema: { id: z.number().int() }, annotations: READ }, async ({ id }: any) => {
    try {
      const data = await orRequest("get", `${opts.path}/${id}`);
      return { content: [{ type: "text", text: formatResponse(data) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleError(e) }] };
    }
  });
}

// Confirm-gate for writes: returns a preview string unless confirm===true, otherwise runs exec().
export async function gated(confirm: boolean | undefined, previewText: string, exec: () => Promise<string>) {
  if (confirm !== true) return { content: [{ type: "text" as const, text: `PREVIEW — nothing changed.\n${previewText}\n\nCall again with confirm=true to apply.` }] };
  try {
    return { content: [{ type: "text" as const, text: await exec() }] };
  } catch (e) {
    return { content: [{ type: "text" as const, text: handleError(e) }] };
  }
}
