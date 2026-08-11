import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerPropertyTools(server: McpServer) {
  server.registerTool(
    "ownerrez_list_properties",
    {
      title: "List Properties",
      description: "List properties. Returns a compact view by default (id, name, active, beds/baths, guests, city, type); set full=true for every field. Use limit to cap results.",
      inputSchema: {
        active: z.boolean().optional().describe("Filter by active status."),
        limit: z.number().int().optional().describe("Max properties to return."),
        full: z.boolean().optional().describe("Return every field instead of the compact view."),
        include_tags: z.boolean().optional(),
        include_fields: z.boolean().optional(),
      },
      annotations: READ,
    },
    async ({ limit, full, ...params }) => {
      try {
        let items = await orPaged<any>("/properties", params);
        if (limit) items = items.slice(0, limit);
        const out = full ? items : items.map((p) => ({ id: p.id, name: p.name, active: p.active, owner_id: p.owner_id, bedrooms: p.bedrooms, bathrooms: p.bathrooms, max_guests: p.max_guests, city: p.address?.city, property_type: p.property_type }));
        return { content: [{ type: "text", text: formatResponse({ count: out.length, items: out }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  server.registerTool(
    "ownerrez_get_property",
    {
      title: "Get Property",
      description: "Fetch a single property by id, including full detail (owner_id, check-in/out rules, capacity, address).",
      inputSchema: { id: z.number().int().describe("The property id.") },
      annotations: READ,
    },
    async ({ id }) => {
      try {
        const data = await orRequest("get", `/properties/${id}`);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}
