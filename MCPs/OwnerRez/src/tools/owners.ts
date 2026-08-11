import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orRequest, orPaged, orLegacyGet, formatResponse, handleError } from "../services/ownerrez-client.js";
import { aggregateStatement, zDate, day } from "../logic.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// --- Genuine statements (undocumented legacy endpoint; best-effort) ---
type Stmt = any;
async function listGenuineStatements(owner_id: number): Promise<Stmt[]> {
  const all = await orLegacyGet<Stmt[]>("/ownerstatements", { ownerId: owner_id });
  return (Array.isArray(all) ? all : []).filter((s) => s.OwnerId === owner_id);
}
function shapeGenuine(s: Stmt) {
  return {
    source: "official-ownerrez",
    statement_id: s.Id,
    owner_id: s.OwnerId,
    period: { from: day(s.w_StatementFromDate), to: day(s.StatementDate) },
    totals: { bookings: s.Bookings, expenses: s.Expenses, owner_payout: s.Total, paid: s.Paid, unpaid: s.Unpaid },
    counts: { bookings: s.IncludedBookings, expenses: s.IncludedExpenses },
    status: s.Status,
    note: "Official OwnerRez statement (real posted numbers).",
  };
}

// --- Synthesized statement (fallback; built from booking charges) ---
async function synthesize(owner_id: number | undefined, property_ids: number[] | undefined, from: string, to: string, include_bookings?: boolean) {
  const allProps = await orPaged<any>("/properties");
  const targets = property_ids?.length ? allProps.filter((p) => property_ids.includes(p.id)) : allProps.filter((p) => p.owner_id === owner_id);
  if (!targets.length) return { source: "synthesized", warning: "No matching properties for this owner/ids.", owner_id, property_ids };

  const bookings = await orPaged<any>("/bookings", { property_ids: targets.map((p) => p.id).join(","), from, to, include_charges: true });
  const agg = aggregateStatement(targets.map((p) => ({ id: p.id, name: p.name })), bookings, include_bookings);
  return {
    source: "synthesized",
    note: "ROUGH ESTIMATE from booking charges by stay-date overlap. Does NOT subtract owner expenses and groups bookings differently than OwnerRez, so it will differ from the official statement. Excludes blocks & canceled. Prefer ownerrez_list_owner_statements for real numbers.",
    owner_id: owner_id ?? null,
    period: { from, to },
    ...agg,
  };
}

export function registerOwnerTools(server: McpServer) {
  server.registerTool(
    "ownerrez_list_owners",
    { title: "List Owners", description: "List all property owners (id, name, contact, last_owner_statement_id).", inputSchema: { active: z.boolean().optional(), include_fields: z.boolean().optional() }, annotations: READ },
    async (params) => {
      try { const items = await orPaged("/owners", params); return { content: [{ type: "text", text: formatResponse({ count: items.length, items }) }] }; }
      catch (e) { return { content: [{ type: "text", text: handleError(e) }] }; }
    }
  );

  server.registerTool(
    "ownerrez_get_owner",
    { title: "Get Owner", description: "Fetch a single owner by id.", inputSchema: { id: z.number().int() }, annotations: READ },
    async ({ id }) => {
      try { const data = await orRequest("get", `/owners/${id}`); return { content: [{ type: "text", text: formatResponse(data) }] }; }
      catch (e) { return { content: [{ type: "text", text: handleError(e) }] }; }
    }
  );

  server.registerTool(
    "ownerrez_list_owner_statements",
    {
      title: "List Owner Statements (official)",
      description: "List an owner's real OwnerRez statements (id, period, owner payout, paid/unpaid), newest first. Use the id with ownerrez_get_owner_statement.",
      inputSchema: { owner_id: z.number().int().describe("Owner to list statements for.") },
      annotations: READ,
    },
    async ({ owner_id }) => {
      try {
        const stmts = (await listGenuineStatements(owner_id))
          .sort((a, b) => day(b.StatementDate).localeCompare(day(a.StatementDate)))
          .map((s) => ({ statement_id: s.Id, period: { from: day(s.w_StatementFromDate), to: day(s.StatementDate) }, owner_payout: s.Total, paid: s.Paid, unpaid: s.Unpaid, bookings: s.IncludedBookings, status: s.Status }));
        return { content: [{ type: "text", text: formatResponse({ owner_id, count: stmts.length, statements: stmts }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Official statements unavailable (${e instanceof Error ? e.message : e}). Try ownerrez_get_owner_statement with from/to to synthesize one.` }] };
      }
    }
  );

  // Genuine-first: return OwnerRez's real posted statement; auto-fall back to the synthesizer.
  server.registerTool(
    "ownerrez_get_owner_statement",
    {
      title: "Get Owner Statement",
      description:
        "Return an owner statement. Prefers OwnerRez's official statement (by statement_id, or the latest / period-matching one for an owner_id); if none exists or the official source is unavailable, synthesizes one from booking charges (needs from+to). Set synthesize=true to force the estimate.",
      inputSchema: {
        owner_id: z.number().int().optional().describe("Owner to build/fetch the statement for."),
        statement_id: z.number().int().optional().describe("Fetch this exact official statement."),
        property_ids: z.array(z.number().int()).optional().describe("Synthesizer only: specific properties."),
        from: zDate.optional().describe("Period start (e.g. 2026-07-01). Used to pick an official statement or to synthesize."),
        to: zDate.optional().describe("Period end (e.g. 2026-07-31)."),
        synthesize: z.boolean().optional().describe("Force the synthesized estimate instead of the official statement."),
        include_bookings: z.boolean().optional().describe("Synthesizer only: include per-booking detail."),
      },
      annotations: READ,
    },
    async ({ owner_id, statement_id, property_ids, from, to, synthesize: force, include_bookings }) => {
      const canSynth = (owner_id || property_ids?.length) && from && to;
      try {
        if (!force) {
          // 1) exact official statement
          if (statement_id) {
            const s = await orLegacyGet<Stmt>(`/ownerstatements/${statement_id}`);
            return { content: [{ type: "text", text: formatResponse(shapeGenuine(s)) }] };
          }
          // 2) official statement for an owner (period-matched, else latest)
          if (owner_id) {
            const stmts = await listGenuineStatements(owner_id);
            if (stmts.length) {
              let pick;
              if (from && to) pick = stmts.filter((s) => day(s.w_StatementFromDate) <= to && day(s.StatementDate) >= from).sort((a, b) => day(b.StatementDate).localeCompare(day(a.StatementDate)))[0];
              if (!pick) pick = stmts.sort((a, b) => day(b.StatementDate).localeCompare(day(a.StatementDate)))[0];
              if (pick) return { content: [{ type: "text", text: formatResponse(shapeGenuine(pick)) }] };
            }
            // no official statement found → fall through to synth
          }
        }
        // 3) synthesize (forced, or fallback)
        if (canSynth) {
          const out = await synthesize(owner_id, property_ids, from!, to!, include_bookings);
          if (!force) (out as any).note = "No official statement matched — " + (out as any).note;
          return { content: [{ type: "text", text: formatResponse(out) }] };
        }
        return { content: [{ type: "text", text: "No official statement found and can't synthesize without owner_id/property_ids plus from and to. Provide a date range, or list official statements with ownerrez_list_owner_statements." }] };
      } catch (e) {
        // official source errored → try synth if we can
        if (!force && canSynth) {
          try {
            const out = await synthesize(owner_id, property_ids, from!, to!, include_bookings);
            (out as any).note = `Official statement unavailable (${e instanceof Error ? e.message : e}); showing synthesized estimate. ` + (out as any).note;
            return { content: [{ type: "text", text: formatResponse(out) }] };
          } catch (e2) { return { content: [{ type: "text", text: handleError(e2) }] }; }
        }
        return { content: [{ type: "text", text: handleError(e) }] };
      }
    }
  );
}
