import test from "node:test";
import assert from "node:assert/strict";
import {
  splitCsvLine,
  parseCsvText,
  validateRow,
  findDuplicateTransactionId,
} from "./csvProcessing.js";

// --- splitCsvLine ---

test("splitCsvLine: splits a simple comma-separated line", () => {
  assert.deepEqual(splitCsvLine("a,b,c"), ["a", "b", "c"]);
});

test("splitCsvLine: preserves an empty trailing field", () => {
  assert.deepEqual(splitCsvLine("a,b,"), ["a", "b", ""]);
});

test("splitCsvLine: handles a quoted field containing a comma", () => {
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
});

test("splitCsvLine: handles escaped double quotes inside a quoted field", () => {
  assert.deepEqual(splitCsvLine('a,"say ""hi""",c'), ["a", 'say "hi"', "c"]);
});

// --- parseCsvText ---

test("parseCsvText: parses header + rows into keyed objects", () => {
  const csv = "transactionId,amount\nTXN-1,10\nTXN-2,20";
  const rows = parseCsvText(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].transactionId, "TXN-1");
  assert.equal(rows[0].amount, "10");
  assert.equal(rows[1].transactionId, "TXN-2");
});

test("parseCsvText: returns an empty array for an empty file", () => {
  assert.deepEqual(parseCsvText(""), []);
});

test("parseCsvText: returns an empty array for a header-only file", () => {
  assert.deepEqual(parseCsvText("transactionId,amount"), []);
});

test("parseCsvText: flags a row with fewer columns than the header", () => {
  const csv = "transactionId,amount,currency,status,createdAt\nTXN-1,10,USD,SUCCESS";
  const rows = parseCsvText(csv);
  assert.equal(rows[0].__columnCountMismatch, "4");
});

test("parseCsvText: flags a row with more columns than the header", () => {
  const csv = "transactionId,amount\nTXN-1,10,extra,extra2";
  const rows = parseCsvText(csv);
  assert.equal(rows[0].__columnCountMismatch, "4");
});

test("parseCsvText: does not flag a row with a matching column count", () => {
  const csv = "transactionId,amount\nTXN-1,10";
  const rows = parseCsvText(csv);
  assert.equal(rows[0].__columnCountMismatch, undefined);
});

// --- validateRow ---

const validRecord = {
  transactionId: "TXN-1",
  amount: "10.50",
  currency: "USD",
  status: "SUCCESS",
  createdAt: "2026-08-01",
};

test("validateRow: accepts a fully valid row", () => {
  const result = validateRow(validRecord, 2);
  assert.equal(result.transactionId, "TXN-1");
  assert.equal(result.amount, 10.5);
  assert.equal(result.currency, "USD");
  assert.equal(result.status, "SUCCESS");
});

test("validateRow: rejects a missing transactionId", () => {
  assert.throws(() => validateRow({ ...validRecord, transactionId: "" }, 2), /transactionId is required/);
});

test("validateRow: rejects a non-numeric amount", () => {
  assert.throws(() => validateRow({ ...validRecord, amount: "abc" }, 2), /amount must be a positive number/);
});

test("validateRow: rejects a zero or negative amount", () => {
  assert.throws(() => validateRow({ ...validRecord, amount: "-5" }, 2), /amount must be a positive number/);
  assert.throws(() => validateRow({ ...validRecord, amount: "0" }, 2), /amount must be a positive number/);
});

test("validateRow: rejects an unsupported currency", () => {
  assert.throws(() => validateRow({ ...validRecord, currency: "XYZ" }, 2), /unsupported currency/);
});

test("validateRow: rejects an invalid status", () => {
  assert.throws(() => validateRow({ ...validRecord, status: "COMPLETE" }, 2), /invalid status/);
});

test("validateRow: rejects an invalid date", () => {
  assert.throws(() => validateRow({ ...validRecord, createdAt: "not-a-date" }, 2), /createdAt must be a valid date/);
});

test("validateRow: uppercases currency and status on success", () => {
  const result = validateRow({ ...validRecord, currency: "usd", status: "success" }, 2);
  assert.equal(result.currency, "USD");
  assert.equal(result.status, "SUCCESS");
});

// --- findDuplicateTransactionId ---

test("findDuplicateTransactionId: returns null when the ID is new", () => {
  const result = findDuplicateTransactionId("TXN-1", new Set(), new Set());
  assert.equal(result, null);
});

test("findDuplicateTransactionId: detects a duplicate within the same file", () => {
  const seenInFile = new Set(["TXN-1"]);
  const result = findDuplicateTransactionId("TXN-1", seenInFile, new Set());
  assert.match(result ?? "", /duplicate transactionId within file/);
});

test("findDuplicateTransactionId: detects an ID that already exists in the database", () => {
  const existingIds = new Set(["TXN-1"]);
  const result = findDuplicateTransactionId("TXN-1", new Set(), existingIds);
  assert.match(result ?? "", /transactionId already exists/);
});
