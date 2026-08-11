import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Canned, one-click workflows. Each returns a user message that steers Claude to the right tools.
const userMsg = (text: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text } }] });

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "weekly_turnover_briefing",
    {
      title: "Weekly turnover briefing",
      description: "Arrivals, departures, and same-day turnovers for a date range, flagged for cleaning.",
      argsSchema: { from: z.string().describe("Start date, e.g. 2026-08-10"), to: z.string().describe("End date, e.g. 2026-08-16") },
    },
    ({ from, to }) =>
      userMsg(
        `Use ownerrez_get_schedule for ${from} to ${to}. Give me a concise operational briefing grouped by day: ` +
        `check-ins, check-outs, and call out every same-day turnover (cleaning pinch points). Note any long stays running through the week.`
      )
  );

  server.registerPrompt(
    "monthly_owner_statement",
    {
      title: "Monthly owner statement",
      description: "Pull an owner's official statement (falls back to a synthesized estimate).",
      argsSchema: { owner: z.string().describe("Owner name or id"), period: z.string().optional().describe("e.g. July 2026") },
    },
    ({ owner, period }) =>
      userMsg(
        `Find the owner matching "${owner}" with ownerrez_list_owners, then get their statement with ownerrez_get_owner_statement` +
        `${period ? ` for ${period}` : " (latest)"}. Prefer the official statement; if it's synthesized, say so clearly. ` +
        `Summarize owner payout, gross rent, expenses, and paid vs unpaid.`
      )
  );

  server.registerPrompt(
    "unanswered_inquiries",
    {
      title: "Recent inquiries to follow up",
      description: "List recent leads and surface which ones look like they still need a reply.",
      argsSchema: { since: z.string().describe("Look back from this date, e.g. 2026-08-01") },
    },
    ({ since }) =>
      userMsg(
        `Use ownerrez_list_inquiries with since_utc=${since}. For each recent lead, read its thread with ownerrez_list_thread_messages ` +
        `(using a thread_id) and tell me which ones the last message was from the guest (i.e. awaiting my reply). List them with property, dates, and a one-line suggested next step.`
      )
  );
}
