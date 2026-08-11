import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, formatResponse, handleError } from "../services/ownerrez-client.js";
import { isMessagingGated } from "../logic.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// Messaging is unavailable to Personal Access Tokens — OwnerRez returns 402 `messaging_not_enabled`
// and requires an OAuth app instead. Turn that into one clear explanation instead of a raw error.
const NOTE = "OwnerRez messaging is NOT available with a Personal Access Token — the /v2/messages endpoints require an OAuth app (402 messaging_not_enabled). These tools will only work once the server authenticates via an OAuth-app token. See https://www.ownerrez.com/support/articles/api-errors#messaging_not_enabled";
function messagingError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (isMessagingGated(msg)) return NOTE + `\n\n(underlying error: ${msg})`;
  return handleError(e);
}

export function registerMessageTools(server: McpServer) {
  server.registerTool(
    "ownerrez_list_thread_messages",
    {
      title: "List Thread Messages",
      description:
        "Fetch all messages on a single conversation thread. Requires a thread_id (OwnerRez has no " +
        "global message list). NOTE: messaging is unavailable with a Personal Access Token (requires an OAuth app).",
      inputSchema: { thread_id: z.number().int().describe("The message thread id.") },
      annotations: READ,
    },
    async ({ thread_id }) => {
      try {
        // NOTE: this endpoint uses camelCase `threadId` (unlike the snake_case rest of v2).
        const items = await orPaged("/messages", { threadId: thread_id });
        return { content: [{ type: "text", text: formatResponse({ count: items.length, items }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: messagingError(e) }] };
      }
    }
  );

  server.registerTool(
    "ownerrez_get_message",
    {
      title: "Get Message",
      description: "Fetch a single message by id. NOTE: messaging is unavailable with a Personal Access Token (requires an OAuth app).",
      inputSchema: { id: z.number().int() },
      annotations: READ,
    },
    async ({ id }) => {
      try {
        const data = await orRequest("get", `/messages/${id}`);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: messagingError(e) }] };
      }
    }
  );

  // WRITE — sends a real message to a real guest in production. Gated: previews unless confirm===true.
  server.registerTool(
    "ownerrez_send_message",
    {
      title: "Send Message",
      description:
        "Post a message to a guest thread. NOTE: unavailable with a Personal Access Token (requires an OAuth app). " +
        "WARNING: in production this reaches the real guest. " +
        "Without confirm=true it only previews and sends nothing. Use the guest's real name, not template codes.",
      inputSchema: {
        thread_id: z.number().int().describe("Thread to post on."),
        body: z.string().describe("Message text."),
        attachment_url: z.string().optional().describe("Public image URL, ≤5MB."),
        confirm: z.boolean().optional().describe("Must be true to actually send."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ thread_id, body, attachment_url, confirm }) => {
      try {
        if (confirm !== true) {
          return { content: [{ type: "text", text: `PREVIEW — nothing sent. Would POST to thread ${thread_id}:\n\n"${body}"${attachment_url ? `\n[attachment: ${attachment_url}]` : ""}\n\nCall again with confirm=true to send.` }] };
        }
        const data = await orRequest("post", "/messages", { data: { thread_id, body, attachment_url } });
        return { content: [{ type: "text", text: `Sent.\n${formatResponse(data)}` }] };
      } catch (e) {
        return { content: [{ type: "text", text: messagingError(e) }] };
      }
    }
  );
}
