// Pure, network-free logic — extracted so it can be unit-tested (see logic.test.ts).
import { z } from "zod";

export const round = (n: number) => Math.round((n ?? 0) * 100) / 100;
export const day = (s?: string) => (s ?? "").slice(0, 10);

// Accepts a date (2026-08-10) or datetime (2026-08-10T00:00:00Z). Rejects garbage at the input boundary.
export const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T].*)?$/;
export const zDate = z.string().regex(DATE_RE, "Use a date like 2026-08-10 (or an ISO datetime).");

// next_page_url may be absolute (https://api.ownerrez.com/v2/...) or root-relative (/v2/...).
// Our axios baseURL already includes /v2, so strip the origin and a leading /v2 to avoid /v2/v2.
export function normalizeNextUrl(next: string): string {
  return String(next).replace(/^https?:\/\/[^/]+/, "").replace(/^\/v2/, "");
}

// Aggregate an owner statement from booking charge lines. Excludes blocks and canceled bookings.
export function aggregateStatement(
  targets: Array<{ id: number; name?: string }>,
  bookings: any[],
  includeBookings = false
): { properties: any[]; totals: any; booking_detail?: any[] } {
  const per = new Map<number, any>();
  for (const p of targets) per.set(p.id, { property_id: p.id, property: p.name, bookings: 0, rent: 0, owner_payout: 0, commission: 0, total_charges: 0 });
  const detail: any[] = [];

  for (const b of bookings) {
    if (b.is_block || b.status === "canceled") continue;
    const agg = per.get(b.property_id);
    if (!agg) continue;
    agg.bookings += 1;
    let bRent = 0, bOwner = 0, bComm = 0, bTotal = 0;
    for (const c of b.charges ?? []) {
      const amt = c.amount ?? 0;
      bTotal += amt;
      if (c.type === "rent") bRent += amt;
      bOwner += c.owner_amount ?? 0;
      bComm += c.commission_amount ?? 0;
    }
    agg.rent += bRent; agg.owner_payout += bOwner; agg.commission += bComm; agg.total_charges += bTotal;
    if (includeBookings) detail.push({ booking_id: b.id, property_id: b.property_id, arrival: day(b.arrival), departure: day(b.departure), rent: round(bRent), owner_payout: round(bOwner), commission: round(bComm) });
  }

  const properties = [...per.values()].map((a) => ({ ...a, rent: round(a.rent), owner_payout: round(a.owner_payout), commission: round(a.commission), total_charges: round(a.total_charges) }));
  const totals = properties.reduce(
    (t, a) => ({ bookings: t.bookings + a.bookings, rent: round(t.rent + a.rent), owner_payout: round(t.owner_payout + a.owner_payout), commission: round(t.commission + a.commission), total_charges: round(t.total_charges + a.total_charges) }),
    { bookings: 0, rent: 0, owner_payout: 0, commission: 0, total_charges: 0 }
  );
  return includeBookings ? { properties, totals, booking_detail: detail } : { properties, totals };
}

// Bucket bookings into a schedule: arrivals / departures / in-house / same-day turnovers, for [from, to].
export function bucketSchedule(
  rows: Array<{ property: string; guest: string | null; arrival: string; departure: string }>,
  from: string,
  to: string
) {
  const arrivals = rows.filter((r) => r.arrival >= from && r.arrival <= to).sort((a, b) => a.arrival.localeCompare(b.arrival));
  const departures = rows.filter((r) => r.departure >= from && r.departure <= to).sort((a, b) => a.departure.localeCompare(b.departure));
  const in_house = rows.filter((r) => r.arrival < from && r.departure > to);
  const outByKey = new Map(departures.map((r) => [`${r.property}|${r.departure}`, r]));
  const turnovers = arrivals
    .filter((r) => outByKey.has(`${r.property}|${r.arrival}`))
    .map((r) => ({ date: r.arrival, property: r.property, out_guest: outByKey.get(`${r.property}|${r.arrival}`)!.guest, in_guest: r.guest }));
  return {
    period: { from, to },
    totals: { arrivals: arrivals.length, departures: departures.length, in_house: in_house.length, turnovers: turnovers.length },
    arrivals, departures, in_house, turnovers,
  };
}

// Recognize the "messaging needs an OAuth app" gate so tools can explain it clearly.
export function isMessagingGated(errMsg: string): boolean {
  return /messaging_not_enabled|402|does not support/i.test(errMsg);
}
