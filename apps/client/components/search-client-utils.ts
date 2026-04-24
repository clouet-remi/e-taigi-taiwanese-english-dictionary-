import type { ResultEntry } from "./result-entry";

type SearchPayload = {
  results?: ResultEntry[] | null;
};

export const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const buildSearchUrl = (base: string, query: string, limit = 20) => {
  const url = new URL("/api/search", base);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  return url.toString();
};

export const normalizeSearchResults = (payload: SearchPayload | null | undefined) =>
  Array.isArray(payload?.results) ? payload.results : [];

export const getResultCountLabel = (count: number) =>
  `${count} result${count === 1 ? "" : "s"}`;
