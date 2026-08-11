import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";

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
}
