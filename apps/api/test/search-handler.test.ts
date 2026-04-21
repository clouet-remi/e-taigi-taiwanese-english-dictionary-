import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { searchHandler } from "../src/routes/search.ts";
import prisma from "../src/db.ts";
import { createMockResponse } from "./helpers/mockResponse.ts";

type QueryRawImplementation = typeof prisma.$queryRaw;

let originalQueryRaw: QueryRawImplementation;

beforeEach(() => {
  originalQueryRaw = prisma.$queryRaw;
});

const withMockedQueryRaw = async (
  implementation: QueryRawImplementation,
  run: () => Promise<void>
) => {
  prisma.$queryRaw = implementation;
  try {
    await run();
  } finally {
    prisma.$queryRaw = originalQueryRaw;
  }
};

describe("searchHandler", () => {
  it("returns 400 for empty query", async () => {
    const req = { query: { q: "", limit: "10" } } as unknown as Request;
    const res = createMockResponse();

    await searchHandler(req, res as never);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload?.error, "Invalid query");
  });

  it("returns audioUrl field when available", async () => {
    const req = { query: { q: "\u53f0\u7063", limit: "10" } } as unknown as Request;
    const res = createMockResponse();

    await withMockedQueryRaw(
      (async () => [
        {
          id: 1,
          hoaBun: "\u53f0\u7063",
          engBun: "Taiwan",
          pojUnicode: null,
          pojInput: null,
          kipUnicode: null,
          kipInput: null,
          audioUrl: "https://example.com/audio.mp3",
        },
      ]) as QueryRawImplementation,
      async () => {
        await searchHandler(req, res as never);
      }
    );

    assert.equal(res.payload?.query, "\u53f0\u7063");
    assert.equal(res.payload?.mode, "hanzi");
    assert.equal(res.payload?.count, 1);
    assert.equal(
      Array.isArray(res.payload?.results) && res.payload.results[0]?.audioUrl,
      "https://example.com/audio.mp3"
    );
  });

  it("uses the SQL-backed English search path", async () => {
    const req = { query: { q: "mother", limit: "5" } } as unknown as Request;
    const res = createMockResponse();
    let callCount = 0;

    await withMockedQueryRaw(
      (async () => {
        callCount += 1;
        return [
          {
            id: 3,
            hoaBun: "\u5abd\u5abd",
            engBun: "mother, mama",
            pojUnicode: "a-bu2/a-bo2",
            pojInput: "a-bu2/a-bo2",
            kipUnicode: "a-bu2/a-bo2",
            kipInput: "a-bu2/a-bo2",
            audioUrl: "https://example.com/mother.mp3",
          },
        ];
      }) as QueryRawImplementation,
      async () => {
        await searchHandler(req, res as never);
      }
    );

    assert.equal(callCount, 1);
    assert.equal(res.payload?.query, "mother");
    assert.equal(res.payload?.mode, "english");
    assert.equal(res.payload?.count, 1);
  });

  it("gracefully handles unexpected errors", async () => {
    const req = { query: { q: "\u53f0\u7063", limit: "10" } } as unknown as Request;
    const res = createMockResponse();
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      await withMockedQueryRaw(
        (async () => {
          throw new Error("DB down");
        }) as QueryRawImplementation,
        async () => {
          await searchHandler(req, res as never);
        }
      );
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(res.statusCode, 500);
    assert.equal(res.payload?.error, "Internal server error");
  });
});
