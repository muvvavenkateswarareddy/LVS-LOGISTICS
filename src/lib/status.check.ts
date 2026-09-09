/**
 * Self-check for the expiry engine + compliance maths.
 * Run: npm run check
 */
import assert from "node:assert/strict";
import { expiresWithin, formatDaysRemaining, getDaysRemaining, getDocumentStatus } from "./status";
import { getVehicleCompliance } from "./compliance";

const today = new Date("2026-09-05T10:30:00Z");
const day = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// days remaining ignores the time of day
assert.equal(getDaysRemaining(day(0), today), 0);
assert.equal(getDaysRemaining(day(7), today), 7);
assert.equal(getDaysRemaining(day(-1), today), -1);

// status boundaries: expired < 0 <= critical <= 7 < warning <= 30 < upcoming <= 60 < valid
assert.equal(getDocumentStatus(day(-1), today), "expired");
assert.equal(getDocumentStatus(day(0), today), "critical");
assert.equal(getDocumentStatus(day(7), today), "critical");
assert.equal(getDocumentStatus(day(8), today), "warning");
assert.equal(getDocumentStatus(day(30), today), "warning");
assert.equal(getDocumentStatus(day(31), today), "upcoming");
assert.equal(getDocumentStatus(day(60), today), "upcoming");
assert.equal(getDocumentStatus(day(61), today), "valid");

const types = [{ id: "t1", name: "Insurance" }, { id: "t2", name: "Fitness" }];
const vehicle = {
  documents: [
    { id: "d1", document_type_id: "t1", expiry_date: day(90), is_current: true },
    { id: "d2", document_type_id: "t2", expiry_date: day(-5), is_current: true },
    { id: "d0", document_type_id: "t2", expiry_date: day(-400), is_current: false },
  ],
} as never;

const c = getVehicleCompliance(vehicle, types, today);
assert.equal(c.score, 50, "one of two required types is valid");
assert.equal(c.status, "expired", "worst status wins");
assert.deepEqual(c.missingTypes, []);
assert.equal(c.nextExpiry, day(-5), "earliest current expiry");

// a vehicle with no documents at all is 'missing', not 'valid'
const empty = getVehicleCompliance({ documents: [] } as never, types, today);
assert.equal(empty.score, 0);
assert.equal(empty.status, "missing");
assert.deepEqual(empty.missingTypes, ["Insurance", "Fitness"]);

// documents with no expiry date (Registration Certificate) never expire
assert.equal(getDaysRemaining(null, today), null);
assert.equal(getDocumentStatus(null, today), "no_expiry");
assert.equal(formatDaysRemaining(null), "No expiry");
assert.equal(expiresWithin(null, 30, today), false);
assert.equal(expiresWithin(day(10), 30, today), true);
assert.equal(expiresWithin(day(-1), 30, today), false, "already expired is not 'expiring within'");

const noExpiry = getVehicleCompliance(
  {
    documents: [
      { id: "n1", document_type_id: "t1", expiry_date: null, is_current: true },
      { id: "n2", document_type_id: "t2", expiry_date: day(200), is_current: true },
    ],
  } as never,
  types,
  today,
);
assert.equal(noExpiry.score, 100, "a document without an expiry counts as valid");
assert.equal(noExpiry.status, "valid");
assert.equal(noExpiry.nextExpiry, day(200), "null expiries are skipped when finding the next one");

console.log("status engine + compliance checks passed");
