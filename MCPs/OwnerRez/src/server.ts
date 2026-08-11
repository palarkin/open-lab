// Shared server factory. Both the local (stdio) and remote (HTTP) entry points call this,
// so the tool surface is defined once and never drifts between transports.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerPropertyTools } from "./tools/properties.js";
import { registerBookingTools } from "./tools/bookings.js";
import { registerOwnerTools } from "./tools/owners.js";
import { registerMessageTools } from "./tools/messages.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerGuestTools } from "./tools/guests.js";
import { registerFinanceTools } from "./tools/finance.js";
import { registerInquiryTools } from "./tools/inquiries.js";
import { registerPrompts } from "./tools/prompts.js";

export function buildServer(): McpServer {
  const server = new McpServer({ name: "ownerrez-mcp-server", version: "1.0.0" });
  registerPropertyTools(server);
  registerBookingTools(server);
  registerOwnerTools(server);
  registerMessageTools(server);
  registerCalendarTools(server);
  registerGuestTools(server);
  registerFinanceTools(server);
  registerInquiryTools(server);
  registerPrompts(server);
  return server;
}
