import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, formatResponse, handleError } from "../services/ownerrez-client.js";
import { READ, WRITE, gated } from "./_util.js";

const entityType = z.string().describe("Entity type, e.g. booking, guest, property, inquiry, owner.");

export function registerTagTools(server: McpServer) {
  // Read the tags currently on one entity
  server.registerTool(
    "ownerrez_list_entity_tags",
    {
      title: "List Entity Tags",
      description: "List the tags applied to a single entity (e.g. a booking or guest). Requires the entity's type and id.",
      inputSchema: { entity_type: entityType, entity_id: z.number().int() },
      annotations: READ,
    },
    async ({ entity_type, entity_id }) => {
      try {
        const data = await orRequest("get", "/tags", { params: { entity_type, entity_id } });
        return { content: [{ type: "text", text: formatResponse(data) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );

  // WRITE — add a tag to an entity
  server.registerTool(
    "ownerrez_tag_entity",
    {
      title: "Tag Entity",
      description: "Add a tag to an entity (booking/guest/etc). Give the tag name OR a tag_definition_id. Previews unless confirm=true.",
      inputSchema: {
        entity_type: entityType,
        entity_id: z.number().int(),
        name: z.string().optional().describe("Tag name (use this or tag_definition_id)."),
        tag_definition_id: z.number().int().optional(),
        confirm: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ confirm, ...body }) => {
      return gated(confirm, `Would add tag to ${body.entity_type} ${body.entity_id}:\n${formatResponse(body)}`, async () => {
        const data = await orRequest("post", "/tags", { data: body });
        return `Tag added.\n${formatResponse(data)}`;
      });
    }
  );

  // WRITE — remove a tag by its id
  server.registerTool(
    "ownerrez_untag_entity",
    { title: "Remove Tag", description: "Remove a tag from an entity by the tag's id. Previews unless confirm=true.", inputSchema: { id: z.number().int(), confirm: z.boolean().optional() }, annotations: { ...WRITE, destructiveHint: true } },
    async ({ id, confirm }) => {
      return gated(confirm, `Would remove tag ${id}.`, async () => {
        await orRequest("delete", `/tags/${id}`);
        return `Tag ${id} removed.`;
      });
    }
  );
}
