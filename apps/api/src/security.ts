import type { NextFunction, Request, Response } from "express";
import { handleError } from "./utils/error-handler.js";

type RateLimitOptions = {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const getClientKey = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  const firstForwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim();
  return req.ip || firstForwardedIp || "unknown";
};

export const createRateLimitMiddleware = ({
  enabled = true,
  windowMs = 60_000,
  maxRequests = 60,
}: RateLimitOptions = {}) => {
  if (!enabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const buckets = new Map<string, RateLimitBucket>();

  // Purge expired buckets every 5 minutes to prevent unbounded memory growth
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60_000);
  cleanup.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = String(getClientKey(req));
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(maxRequests - current.count, 0))
    );
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > maxRequests) {
      res.setHeader(
        "Retry-After",
        String(Math.max(Math.ceil((current.resetAt - now) / 1000), 1))
      );
      handleError(
        res,
        429,
        "Too many requests. Please slow down and try again later."
      );
      return;
    }

    next();
  };
};
