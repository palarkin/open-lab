import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, formatResponse, handleError } from "../services/ownerrez-client.js";
import { zDate } from "../logic.js";
import { READ, WRITE, registerReadList, registerReadById, gated } from "./_util.js";

export function registerQuoteTools(server: McpServer) {
  registerReadList(server, {
    name: "ownerrez_list_quotes",
    title: "List Quotes",
    description: "Price quotes sent to potential guests.",
    path: "/quotes",
    inputSchema: {
      property_ids: z.string().optional().describe("Comma-separated property ids."),
      since_utc: zDate.optional(),
      include_charges: z.boolean().optional(),
      include_guest: z.boolean().optional(),
    },
  });
  registerReadById(server, { name: "ownerrez_get_quote", title: "Get Quote", description: "Fetch a single quote by id.", path: "/quotes" });

  // WRITE — create a quote
  server.registerTool(
    "ownerrez_create_quote",
    {
      title: "Create Quote",
      description: "Create a price quote for a property and dates. Previews unless confirm=true.",
      inputSchema: {
        property_id: z.number().int(),
        arrival: zDate,
        departure: zDate,
        adults: z.number().int().optional(),
        children: z.number().int().optional(),
        pets: z.number().int().optional(),
        guest_id: z.number().int().optional(),
        notes: z.string().optional(),
        generate_charges: z.boolean().optional().describe("Compute the full price breakdown."),
        confirm: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ confirm, ...body }) => {
      return gated(confirm, `Would create a quote:\n${formatResponse(body)}`, async () => {
        const data = await orRequest("post", "/quotes", { data: body });
        return `Quote created.\n${formatResponse(data)}`;
      });
    }
  );

  // WRITE — update a quote (partial fields)
  server.registerTool(
    "ownerrez_update_quote",
    {
      title: "Update Quote",
      description: "Update fields on an existing quote (e.g. arrival, departure, adults, notes). Previews unless confirm=true.",
      inputSchema: {
        id: z.number().int(),
        fields: z.record(z.any()).describe("Object of quote fields to change, e.g. {\"notes\":\"...\",\"adults\":3}."),
        confirm: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ id, fields, confirm }) => {
      return gated(confirm, `Would PATCH quote ${id} with:\n${formatResponse(fields)}`, async () => {
        const data = await orRequest("patch", `/quotes/${id}`, { data: fields });
        return `Quote ${id} updated.\n${formatResponse(data)}`;
      });
    }
  );

  // WRITE — delete a quote
  server.registerTool(
    "ownerrez_delete_quote",
    { title: "Delete Quote", description: "Remove a quote by id. Previews unless confirm=true.", inputSchema: { id: z.number().int(), confirm: z.boolean().optional() }, annotations: { ...WRITE, destructiveHint: true } },
    async ({ id, confirm }) => {
      return gated(confirm, `Would delete quote ${id}.`, async () => {
        await orRequest("delete", `/quotes/${id}`);
        return `Quote ${id} deleted.`;
      });
    }
  );
}
