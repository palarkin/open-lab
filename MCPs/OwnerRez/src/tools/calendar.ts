import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";
import { zDate } from "../logic.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerCalendarTools(server: McpServer) {
  // OwnerRez has no calendar endpoint. Availability = bookings/blocks in a date range for a property.
  server.registerTool(
    "ownerrez_get_availability",
    {
      title: "Get Availability",
      description:
        "Show what's booked/blocked for a property in a date range (OwnerRez has no calendar endpoint; " +
        "availability is derived from bookings). Returns bookings overlapping [from, to].",
      inputSchema: {
        property_id: z.number().int(),
        from: zDate.describe("Range start date."),
        to: zDate.describe("Range end date."),
        status: z.enum(["active", "canceled", "pending"]).optional(),
      },
      annotations: READ,
    },
    async ({ property_id, from, to, status }) => {
      try {
        const items = await orPaged("/bookings", { property_ids: String(property_id), from, to, status });
        return { content: [{ type: "text", text: formatResponse({ property_id, from, to, count: items.length, bookings: items }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  // WRITE — changes live nightly rates. Gated: previews unless confirm===true.
  server.registerTool(
    "ownerrez_update_rate",
    {
      title: "Update Rate (spot rate)",
      description:
        "Set the nightly rate for specific dates on a property (spot rates). Without confirm=true it only " +
        "previews. amount=null means 'use the seasonal default'. Optionally set min/max nights.",
      inputSchema: {
        property_id: z.number().int(),
        dates: z.array(zDate).describe("Dates to set (e.g. ['2026-08-01','2026-08-02'])."),
        amount: z.number().nullable().describe("Nightly rate; null = seasonal default."),
        min_nights: z.number().int().optional(),
        max_nights: z.number().int().optional(),
        currency: z.string().optional().describe("Must match the property's currency if provided."),
        confirm: z.boolean().optional().describe("Must be true to actually write."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ property_id, dates, amount, min_nights, max_nights, currency, confirm }) => {
      try {
        const payload = dates.map((date) => ({ property_id, date, amount, min_nights, max_nights, currency }));
        if (confirm !== true) {
          return { content: [{ type: "text", text: `PREVIEW — nothing changed. Would PATCH /v2/spotrates with:\n${formatResponse(payload)}\n\nCall again with confirm=true to apply.` }] };
        }
        const data = await orRequest("patch", "/spotrates", { data: payload });
        return { content: [{ type: "text", text: `Updated ${dates.length} date(s).\n${formatResponse(data)}` }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}
