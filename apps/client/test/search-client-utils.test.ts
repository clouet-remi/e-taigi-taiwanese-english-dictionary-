import test from "node:test";
import assert from "node:assert/strict";
import type { ResultEntry } from "../components/result-entry";
import {
  buildSearchUrl,
  getApiBaseUrl,
  getResultCountLabel,
  normalizeSearchResults,
} from "../components/search-client-utils.ts";

test("getApiBaseUrl returns a non-empty URL string", () => {
  const url = getApiBaseUrl();
  assert.equal(typeof url, "string");
  assert.ok(url.startsWith("http"), `expected a URL, got: ${url}`);
});

test("buildSearchUrl keeps the configured base and query params", () => {
  const url = buildSearchUrl("http://localhost:5001", "taiwan", 12);

  assert.equal(url, "http://localhost:5001/api/search?q=taiwan&limit=12");
});

test("normalizeSearchResults protects the UI from malformed payloads", () => {
  assert.deepEqual(normalizeSearchResults({ results: [{ id: 1 } as ResultEntry] }), [
    { id: 1 },
  ]);
  assert.deepEqual(normalizeSearchResults({ results: null }), []);
  assert.deepEqual(normalizeSearchResults(null), []);
});

test("getResultCountLabel keeps the count text consistent", () => {
  assert.equal(getResultCountLabel(1), "1 result");
  assert.equal(getResultCountLabel(2), "2 results");
});
