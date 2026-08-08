import test from "node:test";
import assert from "node:assert/strict";
import { listImports } from "./importRepository.js";

// These exercise the in-memory (prisma=null) path, which reads from the
// static mockImports fixture in importMock.ts:
//   import_001: COMPLETED, filename "transactions-2026-07-29.csv"
//   import_002: FAILED,    filename "transactions-2026-07-28.csv"

test("listImports: returns all imports with default pagination", async () => {
  const result = await listImports(null, {});
  assert.equal(result.total, 2);
  assert.equal(result.data.length, 2);
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 10);
});

test("listImports: paginates correctly", async () => {
  const result = await listImports(null, { page: 1, pageSize: 1 });
  assert.equal(result.data.length, 1);
  assert.equal(result.total, 2);
});

test("listImports: filters by status", async () => {
  const result = await listImports(null, { status: "FAILED" });
  assert.equal(result.total, 1);
  assert.equal(result.data[0].id, "import_002");
});

test("listImports: search matches filename (case-insensitive)", async () => {
  const result = await listImports(null, { search: "07-29" });
  assert.equal(result.total, 1);
  assert.equal(result.data[0].id, "import_001");
});

test("listImports: search with no matches returns an empty result, not an error", async () => {
  const result = await listImports(null, { search: "does-not-exist" });
  assert.equal(result.total, 0);
  assert.deepEqual(result.data, []);
});

test("listImports: sorts by totalRows ascending", async () => {
  const result = await listImports(null, { sortBy: "totalRows", sortOrder: "asc" });
  assert.equal(result.data[0].id, "import_002"); // 45 rows
  assert.equal(result.data[1].id, "import_001"); // 120 rows
});

test("listImports: each import includes its row-level errors", async () => {
  const result = await listImports(null, { search: "07-29" });
  assert.equal(result.data[0].importErrors.length, 2);
  assert.equal(result.data[0].importErrors[0].rowNumber, 24);
});
