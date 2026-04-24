import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../db.js";
import { withResolvedAudioUrl } from "../audioUrl.js";
import { detectMode, escapeLikePattern, normalizeEnglish } from "../search.js";
import { logAndHandleError, handleError } from "../utils/error-handler.js";

type SearchResult = {
  id: number;
  pojUnicode: string | null;
  pojInput: string | null;
  kipUnicode: string | null;
  kipInput: string | null;
  hoaBun: string | null;
  engBun: string | null;
  audioUrl: string | null;
};

const querySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const selectColumns = Prisma.sql`
  "DictWordID" AS id,
  "PojUnicode" AS "pojUnicode",
  "PojInput" AS "pojInput",
  "KipUnicode" AS "kipUnicode",
  "KipInput" AS "kipInput",
  "HoaBun" AS "hoaBun",
  "EngBun" AS "engBun",
  "AudioUrl" AS "audioUrl"
`;

const searchHanzi = async (query: string, limit: number) => {
  const escapedQuery = escapeLikePattern(query);
  const containsPattern = `%${escapedQuery}%`;
  const prefixPattern = `${escapedQuery}%`;

  return prisma.$queryRaw<SearchResult[]>(
    Prisma.sql`
      SELECT ${selectColumns}
      FROM "DictWord"
      WHERE "HoaBun" IS NOT NULL
        AND "HoaBun" LIKE ${containsPattern} ESCAPE '\\'
      ORDER BY
        CASE
          WHEN "HoaBun" = ${query} THEN 0
          WHEN "HoaBun" LIKE ${prefixPattern} ESCAPE '\\' THEN 1
          ELSE 2
        END,
        LENGTH("HoaBun") ASC,
        "HoaBun" ASC
      LIMIT ${limit}
    `
  );
};

const searchEnglish = async (query: string, limit: number) => {
  const normalizedQuery = normalizeEnglish(query);
  const escapedQuery = escapeLikePattern(normalizedQuery);
  const containsPattern = `%${escapedQuery}%`;
  const prefixPattern = `${escapedQuery}%`;

  return prisma.$queryRaw<SearchResult[]>(
    Prisma.sql`
      SELECT ${selectColumns}
      FROM "DictWord"
      WHERE "EngBun" IS NOT NULL
        AND LOWER("EngBun") LIKE ${containsPattern} ESCAPE '\\'
      ORDER BY
        CASE
          WHEN LOWER("EngBun") = ${normalizedQuery} THEN 0
          WHEN LOWER("EngBun") LIKE ${prefixPattern} ESCAPE '\\' THEN 1
          ELSE 2
        END,
        LENGTH("EngBun") ASC,
        "EngBun" ASC
      LIMIT ${limit}
    `
  );
};

export const searchHandler = async (req: Request, res: Response) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return handleError(res, 400, "Invalid query", parsed.error.flatten());
    }

    const { q, limit } = parsed.data;
    const trimmedQuery = q.trim();
    const mode = detectMode(trimmedQuery);

    const results =
      mode === "hanzi"
        ? await searchHanzi(trimmedQuery, limit)
        : await searchEnglish(trimmedQuery, limit);

    const hydratedResults = withResolvedAudioUrl(results);

    return res.json({
      query: trimmedQuery,
      mode,
      count: hydratedResults.length,
      results: hydratedResults,
    });
  } catch (error) {
    return logAndHandleError(res, error, "Search failed");
  }
};
