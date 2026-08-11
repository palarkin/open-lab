import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, formatResponse, handleError } from "../services/ownerrez-client.js";
import { zDate } from "../logic.js";
import { READ, registerReadList, registerReadById } from "./_util.js";

export function registerCatalogTools(server: McpServer) {
  // Which account/token is active
  server.registerTool(
    "ownerrez_whoami",
    { title: "Who Am I", description: "Show the currently authenticated OwnerRez user/account for this token.", inputSchema: {}, annotations: READ },
    async () => {
      try { return { content: [{ type: "text", text: formatResponse(await orRequest("get", "/users/me")) }] }; }
      catch (e) { return { content: [{ type: "text", text: handleError(e) }] }; }
    }
  );

  // Availability search — find properties open for a date range / party
  registerReadList(server, {
    name: "ownerrez_search_available_properties",
    title: "Search Available Properties",
    description: "Find properties that are available for a date range and party size. Great for 'what's open Aug 20–25 for 6 guests?'.",
    path: "/propertysearch",
    inputSchema: {
      available_from: zDate.optional().describe("Start of the desired stay."),
      available_to: zDate.optional().describe("End of the desired stay."),
      guests_min: z.number().int().optional(),
      bedrooms_min: z.number().int().optional(),
      pets_allowed: z.boolean().optional(),
      children_allowed: z.boolean().optional(),
      property_ids: z.string().optional().describe("Comma-separated property ids to limit the search."),
      evaluate_rules: z.boolean().optional().describe("Also apply booking rules (min-stay, etc.)."),
    },
  });

  // Reviews
  registerReadList(server, {
    name: "ownerrez_list_reviews",
    title: "List Reviews",
    description: "Guest reviews and ratings. (May require the Integrated Websites add-on.)",
    path: "/reviews",
    inputSchema: {
      property_id: z.number().int().optional(),
      since_utc: zDate.optional(),
      active: z.boolean().optional(),
      host_review: z.boolean().optional().describe("Filter to host-written reviews."),
      include_guest: z.boolean().optional(),
    },
  });
  registerReadById(server, { name: "ownerrez_get_review", title: "Get Review", description: "Fetch a single review by id.", path: "/reviews" });

  // Pricing config
  const chargeSchema = {
    property_id: z.number().int().optional(),
    active: z.boolean().optional(),
    since_utc: zDate.optional(),
  };
  registerReadList(server, { name: "ownerrez_list_surcharges", title: "List Surcharges", description: "Surcharges (cleaning fees, extra charges) configured on the account.", path: "/surcharges", inputSchema: chargeSchema });
  registerReadList(server, { name: "ownerrez_list_discounts", title: "List Discounts", description: "Discount rules configured on the account.", path: "/discounts", inputSchema: chargeSchema });
  registerReadList(server, { name: "ownerrez_list_fees", title: "List Fees", description: "Fees, optionally for one booking.", path: "/fees", inputSchema: { booking_id: z.number().int().optional(), since_utc: zDate.optional() } });

  // Channel listings
  registerReadList(server, {
    name: "ownerrez_list_listings",
    title: "List Listings",
    description: "Channel listings (Airbnb/Vrbo/etc. mappings). (May require the Integrated Websites add-on.)",
    path: "/listings",
    inputSchema: { includeImages: z.boolean().optional(), includeDescriptions: z.boolean().optional(), includeAmenities: z.boolean().optional() },
  });
  registerReadList(server, { name: "ownerrez_list_listing_sites", title: "List Listing Sites", description: "Channels/listing sites available to this account.", path: "/listingsites", inputSchema: { active: z.boolean().optional() } });

  // Tag definitions (the catalog of possible tags)
  registerReadList(server, { name: "ownerrez_list_tag_definitions", title: "List Tag Definitions", description: "All tags that can be applied to entities.", path: "/tagdefinitions", inputSchema: { active: z.boolean().optional() } });
}
