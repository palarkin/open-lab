import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeNextUrl, aggregateStatement, bucketSchedule, isMessagingGated, DATE_RE } from "./logic.js";

test("normalizeNextUrl strips origin and leading /v2 (the /v2/v2 doubling bug)", () => {
  assert.equal(normalizeNextUrl("https://api.ownerrez.com/v2/properties?offset=20"), "/properties?offset=20");
  assert.equal(normalizeNextUrl("/v2/bookings?offset=40"), "/bookings?offset=40");
  assert.equal(normalizeNextUrl("/properties?offset=20"), "/properties?offset=20");
});

test("DATE_RE accepts dates and datetimes, rejects garbage", () => {
  assert.ok(DATE_RE.test("2026-08-10"));
  assert.ok(DATE_RE.test("2026-08-10T00:00:00Z"));
  assert.ok(!DATE_RE.test("Aug 10"));
  assert.ok(!DATE_RE.test("2026/08/10"));
  assert.ok(!DATE_RE.test("last tuesday"));
});

test("isMessagingGated recognizes the PAT messaging gate", () => {
  assert.ok(isMessagingGated("OwnerRez API 402 (/messages/1) messaging_not_enabled: ..."));
  assert.ok(isMessagingGated("does not support HTTP method 'GET'"));
  assert.ok(!isMessagingGated("OwnerRez API 404 (/messages/1) not_found"));
});

test("aggregateStatement sums owner_amount/commission per property and excludes blocks & canceled", () => {
  const targets = [{ id: 1, name: "Cabin" }, { id: 2, name: "Loft" }];
  const bookings = [
    { id: 10, property_id: 1, charges: [{ type: "rent", amount: 1000, owner_amount: 800, commission_amount: 200 }, { type: "tax", amount: 100, owner_amount: 0, commission_amount: 0 }] },
    { id: 11, property_id: 1, charges: [{ type: "rent", amount: 500, owner_amount: 400, commission_amount: 100 }] },
    { id: 12, property_id: 2, is_block: true, charges: [{ type: "rent", amount: 999, owner_amount: 999 }] }, // excluded
    { id: 13, property_id: 2, status: "canceled", charges: [{ type: "rent", amount: 777, owner_amount: 777 }] }, // excluded
    { id: 14, property_id: 2, charges: [{ type: "rent", amount: 300, owner_amount: 240, commission_amount: 60 }] },
  ];
  const { properties, totals } = aggregateStatement(targets, bookings);
  const cabin = properties.find((p) => p.property_id === 1)!;
  assert.equal(cabin.bookings, 2);
  assert.equal(cabin.rent, 1500);
  assert.equal(cabin.owner_payout, 1200);
  assert.equal(cabin.commission, 300);
  assert.equal(cabin.total_charges, 1600); // includes the $100 tax line
  const loft = properties.find((p) => p.property_id === 2)!;
  assert.equal(loft.bookings, 1); // block + canceled excluded
  assert.equal(loft.owner_payout, 240);
  assert.equal(totals.owner_payout, 1440);
  assert.equal(totals.bookings, 3);
});

test("aggregateStatement rounds to cents and includes booking detail when asked", () => {
  const out = aggregateStatement([{ id: 1, name: "A" }], [{ id: 9, property_id: 1, arrival: "2026-07-01T00:00:00", departure: "2026-07-03T00:00:00", charges: [{ type: "rent", amount: 33.335, owner_amount: 33.335 }] }], true);
  assert.equal(out.properties[0].owner_payout, 33.34);
  assert.ok(out.booking_detail);
  assert.equal(out.booking_detail![0].arrival, "2026-07-01");
});

test("bucketSchedule classifies arrivals, departures, in-house, and same-day turnovers", () => {
  const rows = [
    { property: "Cabin", guest: "Out Guy", arrival: "2026-08-05", departure: "2026-08-10" }, // departs in window
    { property: "Cabin", guest: "In Guy", arrival: "2026-08-10", departure: "2026-08-14" },  // arrives in window -> turnover with Out Guy
    { property: "Loft", guest: "Stayover", arrival: "2026-08-01", departure: "2026-08-20" }, // spans window -> in_house
    { property: "Loft", guest: "Future", arrival: "2026-08-16", departure: "2026-08-18" },   // arrives in window
  ];
  const s = bucketSchedule(rows, "2026-08-10", "2026-08-16");
  assert.equal(s.totals.arrivals, 2);   // In Guy, Future
  assert.equal(s.totals.departures, 2); // Out Guy (08-10) + In Guy (08-14, departs within window)
  assert.equal(s.totals.in_house, 1);   // Stayover
  assert.equal(s.totals.turnovers, 1);  // Cabin on 2026-08-10
  assert.equal(s.turnovers[0].out_guest, "Out Guy");
  assert.equal(s.turnovers[0].in_guest, "In Guy");
});
