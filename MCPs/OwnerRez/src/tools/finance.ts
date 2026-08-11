import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";
import { zDate } from "../logic.js";
import { registerReadById } from "./_util.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// payments/deposits/refunds all share the same query surface: since_utc + booking_id.
// Require one of them so a call can't accidentally page the entire account into context.
function financeTool(server: McpServer, name: string, path: string, title: string, what: string) {
  server.registerTool(
    name,
    {
      title,
      description: `List ${what}. Provide booking_id (for one booking) or since_utc (recent activity) — one is required to keep results bounded.`,
      inputSchema: {
        booking_id: z.number().int().optional().describe("Filter to one booking."),
        since_utc: zDate.optional().describe("Only records created/changed since this UTC datetime."),
        limit: z.number().int().optional(),
      },
      annotations: READ,
    },
    async ({ booking_id, since_utc, limit }) => {
      try {
        if (booking_id === undefined && !since_utc) {
          return { content: [{ type: "text", text: `Error: provide booking_id or since_utc to list ${what}.` }] };
        }
        let items = await orPaged<any>(path, { booking_id, since_utc });
        if (limit) items = items.slice(0, limit);
        return { content: [{ type: "text", text: formatResponse({ count: items.length, items }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}

export function registerFinanceTools(server: McpServer) {
  financeTool(server, "ownerrez_list_payments", "/payments", "List Payments", "payments (guest → you)");
  financeTool(server, "ownerrez_list_deposits", "/deposits", "List Deposits", "deposits (payouts grouping)");
  financeTool(server, "ownerrez_list_refunds", "/refunds", "List Refunds", "refunds");
  registerReadById(server, { name: "ownerrez_get_payment", title: "Get Payment", description: "Fetch a single payment by id.", path: "/payments" });
  registerReadById(server, { name: "ownerrez_get_deposit", title: "Get Deposit", description: "Fetch a single deposit by id.", path: "/deposits" });
  registerReadById(server, { name: "ownerrez_get_refund", title: "Get Refund", description: "Fetch a single refund by id.", path: "/refunds" });
}
