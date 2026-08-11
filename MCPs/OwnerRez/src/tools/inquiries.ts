import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, getPropertiesCached, formatResponse, handleError } from "../services/ownerrez-client.js";
import { zDate, day } from "../logic.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const guestName = (i: any) => {
  const g = i.guest ?? (i.guests ?? [])[0] ?? {};
  return g.name || [g.first_name, g.last_name].filter(Boolean).join(" ") || null;
};

export function registerInquiryTools(server: McpServer) {
  server.registerTool(
    "ownerrez_list_inquiries",
    {
      title: "List Inquiries (leads)",
      description:
        "List pre-booking guest inquiries/leads: requested dates, party size, source channel, and the " +
        "thread_ids used to read/reply via the messaging tools. Compact by default; full=true for every field.",
      inputSchema: {
        property_ids: z.array(z.number().int()).optional().describe("Filter to these property ids."),
        since_utc: zDate.optional().describe("Only inquiries created/changed since this UTC datetime."),
        limit: z.number().int().optional(),
        full: z.boolean().optional().describe("Return every field instead of the compact view."),
      },
      annotations: READ,
    },
    async ({ property_ids, since_utc, limit, full }) => {
      try {
        const query: any = { property_ids: property_ids?.join(","), since_utc, include_guest: true };
        let items = await orPaged<any>("/inquiries", query);
        items.sort((a, b) => day(b.received_utc || b.created_utc).localeCompare(day(a.received_utc || a.created_utc)));
        if (limit) items = items.slice(0, limit);
        if (full) return { content: [{ type: "text", text: formatResponse({ count: items.length, items }) }] };
        const { nameById } = await getPropertiesCached();
        const out = items.map((i) => ({
          id: i.id,
          received: day(i.received_utc || i.created_utc),
          property: nameById.get(i.property_id) ?? i.property_id,
          property_id: i.property_id,
          guest: guestName(i),
          arrival: day(i.arrival),
          departure: day(i.departure),
          party: `${i.adults ?? 0}a ${i.children ?? 0}c ${i.pets ?? 0}p`,
          channel: i.listing_site,
          type: i.type,
          thread_ids: i.thread_ids ?? [],
        }));
        return { content: [{ type: "text", text: formatResponse({ count: out.length, items: out }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  server.registerTool(
    "ownerrez_get_inquiry",
    {
      title: "Get Inquiry",
      description: "Fetch a single inquiry by id (full detail, including thread_ids for messaging).",
      inputSchema: { id: z.number().int() },
      annotations: READ,
    },
    async ({ id }) => {
      try {
        const data = await orRequest("get", `/inquiries/${id}`);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}
