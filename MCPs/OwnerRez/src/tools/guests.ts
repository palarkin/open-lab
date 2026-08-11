import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";
import { WRITE, gated } from "./_util.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const compactGuest = (g: any) => ({
  id: g.id,
  name: g.name || [g.first_name, g.last_name].filter(Boolean).join(" "),
  email: g.email_address || (g.email_addresses ?? [])[0]?.address,
  phone: g.phone?.number || (g.phones ?? [])[0]?.number,
});

export function registerGuestTools(server: McpServer) {
  server.registerTool(
    "ownerrez_search_guests",
    {
      title: "Search Guests",
      description: "Find guests by name or email (the q parameter). Compact results by default; full=true for every field.",
      inputSchema: {
        q: z.string().describe("Search text — a name or email."),
        limit: z.number().int().optional(),
        full: z.boolean().optional(),
      },
      annotations: READ,
    },
    async ({ q, limit, full }) => {
      try {
        let items = await orPaged<any>("/guests", { q });
        if (limit) items = items.slice(0, limit);
        const out = full ? items : items.map(compactGuest);
        return { content: [{ type: "text", text: formatResponse({ count: out.length, items: out }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  server.registerTool(
    "ownerrez_get_guest",
    {
      title: "Get Guest",
      description: "Fetch a single guest by id (full contact record).",
      inputSchema: { id: z.number().int() },
      annotations: READ,
    },
    async ({ id }) => {
      try {
        const data = await orRequest("get", `/guests/${id}`);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  // WRITE — create a guest. Previews unless confirm=true.
  server.registerTool(
    "ownerrez_create_guest",
    {
      title: "Create Guest",
      description:
        "Create a guest record. Provide first_name/last_name/notes directly; use `fields` for advanced " +
        "properties (email_addresses[], phones[], addresses[], tags[]). Previews unless confirm=true.",
      inputSchema: {
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        notes: z.string().optional(),
        fields: z.record(z.any()).optional().describe("Extra guest fields to merge, e.g. {\"email_addresses\":[...]}."),
        confirm: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ first_name, last_name, notes, fields, confirm }) => {
      const body = { ...(fields ?? {}), ...(first_name !== undefined ? { first_name } : {}), ...(last_name !== undefined ? { last_name } : {}), ...(notes !== undefined ? { notes } : {}) };
      return gated(confirm, `Would create a guest:\n${formatResponse(body)}`, async () => {
        const data = await orRequest("post", "/guests", { data: body });
        return `Guest created.\n${formatResponse(data)}`;
      });
    }
  );

  // WRITE — update a guest (partial). Previews unless confirm=true.
  server.registerTool(
    "ownerrez_update_guest",
    {
      title: "Update Guest",
      description: "Update fields on an existing guest (e.g. first_name, last_name, notes). Previews unless confirm=true.",
      inputSchema: { id: z.number().int(), fields: z.record(z.any()).describe("Object of guest fields to change."), confirm: z.boolean().optional() },
      annotations: WRITE,
    },
    async ({ id, fields, confirm }) => {
      return gated(confirm, `Would PATCH guest ${id} with:\n${formatResponse(fields)}`, async () => {
        const data = await orRequest("patch", `/guests/${id}`, { data: fields });
        return `Guest ${id} updated.\n${formatResponse(data)}`;
      });
    }
  );
}
