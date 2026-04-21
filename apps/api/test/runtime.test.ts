import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/testServer.ts";

test("live API search returns dictionary results from Prisma-backed storage", async () => {
  const server = await startTestServer({
    rateLimitEnabled: false,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/search?q=mother&limit=5`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.query, "mother");
    assert.equal(payload.mode, "english");
    assert.ok(Array.isArray(payload.results));
    assert.ok(payload.results.length > 0);
    assert.equal(typeof payload.results[0].id, "number");
    assert.ok("audioUrl" in payload.results[0]);
  } finally {
    await server.close();
  }
});
