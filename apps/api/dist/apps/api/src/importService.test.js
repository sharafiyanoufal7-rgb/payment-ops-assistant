import test from "node:test";
import assert from "node:assert/strict";
import { getImportStatus } from "./importService.js";
test("returns FAILED when there are no successful rows and some failures", () => {
    assert.equal(getImportStatus(0, 3), "FAILED");
});
test("returns PARTIALLY_COMPLETED when some rows succeed and some fail", () => {
    assert.equal(getImportStatus(2, 1), "PARTIALLY_COMPLETED");
});
test("returns COMPLETED when every row succeeds", () => {
    assert.equal(getImportStatus(5, 0), "COMPLETED");
});
