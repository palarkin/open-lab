import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, getPropertiesCached, formatResponse, handleError } from "../services/ownerrez-client.js";
import { bucketSchedule, zDate, day } from "../logic.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const guestName = (b: any) => {
  const g = b.guest ?? {};
  return g.name || [g.first_name, g.last_name].filter(Boolean).join(" ") || b.guest_name || null;
};

export function registerBookingTools(server: McpServer) {
  server.registerTool(
    "ownerrez_list_bookings",
    {
      title: "List Bookings",
      description:
        "Search bookings. Requires property_ids OR since_utc. Compact view by default (id, property, guest, arrival, departure, status); full=true for every field. Use limit to cap. include_charges adds owner_amount/commission (implies full).",
      inputSchema: {
        property_ids: z.array(z.number().int()).optional().describe("Filter to these property ids."),
        from: zDate.optional().describe("Bookings departing on/after this date."),
        to: zDate.optional().describe("Bookings arriving on/before this date."),
        since_utc: zDate.optional().describe("Bookings created/changed since this UTC datetime."),
        status: z.enum(["active", "canceled", "pending"]).optional(),
        limit: z.number().int().optional(),
        full: z.boolean().optional().describe("Return every field instead of the compact view."),
        include_charges: z.boolean().optional().describe("Include charge lines (owner_amount, commission). Returns full detail."),
      },
      annotations: READ,
    },
    async ({ property_ids, limit, full, ...rest }) => {
      try {
        if (!property_ids?.length && !rest.since_utc) {
          return { content: [{ type: "text", text: "Error: OwnerRez requires either `property_ids` or `since_utc` to list bookings." }] };
        }
        const wantFull = full || rest.include_charges;
        const query: any = { ...rest, property_ids: property_ids?.join(","), include_guest: true };
        let items = await orPaged<any>("/bookings", query);
        if (limit) items = items.slice(0, limit);
        if (wantFull) return { content: [{ type: "text", text: formatResponse({ count: items.length, items }) }] };
        const { nameById } = await getPropertiesCached();
        const out = items.map((b) => ({ id: b.id, property_id: b.property_id, property: nameById.get(b.property_id), guest: guestName(b), arrival: day(b.arrival), departure: day(b.departure), status: b.status }));
        return { content: [{ type: "text", text: formatResponse({ count: out.length, items: out }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  server.registerTool(
    "ownerrez_get_booking",
    {
      title: "Get Booking",
      description: "Fetch a single booking by id.",
      inputSchema: { id: z.number().int(), include_charges: z.boolean().optional(), include_guest: z.boolean().optional() },
      annotations: READ,
    },
    async ({ id, ...rest }) => {
      try {
        const data = await orRequest("get", `/bookings/${id}`, { params: rest });
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  // Composed convenience tool: arrivals / departures / in-house / same-day turnovers for a date
  // range, fanning out over all properties internally so the caller doesn't juggle property ids.
  server.registerTool(
    "ownerrez_get_schedule",
    {
      title: "Get Schedule (arrivals / departures / turnovers)",
      description: "The operational schedule for a date range across all properties (or one): who arrives, who departs, who stays through, and same-day turnovers. One call — no need to pass property ids.",
      inputSchema: {
        from: zDate.describe("Range start date, e.g. 2026-08-10."),
        to: zDate.describe("Range end date, e.g. 2026-08-16."),
        property_id: z.number().int().optional().describe("Limit to one property."),
      },
      annotations: READ,
    },
    async ({ from, to, property_id }) => {
      try {
        const { items: props, nameById } = await getPropertiesCached();
        const ids = property_id ? [property_id] : props.map((p) => p.id);
        const bookings = await orPaged<any>("/bookings", { property_ids: ids.join(","), from, to, status: "active", include_guest: true });

        const rows = bookings.filter((b) => !b.is_block).map((b) => ({ property: nameById.get(b.property_id) ?? `prop ${b.property_id}`, guest: guestName(b), arrival: day(b.arrival), departure: day(b.departure) }));
        return { content: [{ type: "text", text: formatResponse(bucketSchedule(rows, from, to)) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}
