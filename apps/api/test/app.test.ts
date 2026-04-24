import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/testServer.ts";

test("GET /api/health returns ok with security headers", async () => {
  const server = await startTestServer({
    rateLimitEnabled: false,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { status: "ok" });
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  } finally {
    await server.close();
  }
});

test("rate limiting blocks repeated requests", async () => {
  const server = await startTestServer({
    rateLimitEnabled: true,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 2,
  });

  try {
    const first = await fetch(`${server.baseUrl}/api/health`);
    const second = await fetch(`${server.baseUrl}/api/health`);
    const third = await fetch(`${server.baseUrl}/api/health`);
    const payload = await third.json();

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
    assert.equal(payload.error, "Too many requests. Please slow down and try again later.");
    assert.equal(third.headers.get("retry-after"), "60");
  } finally {
    await server.close();
  }
});
