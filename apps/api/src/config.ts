import type { CorsOptions } from "cors";
import os from "node:os";

const parseNumber = (
  value: string | undefined,
  fallback: number,
  { min = Number.NEGATIVE_INFINITY } = {}
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
};

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseTrustProxy = (value: string | undefined): string | number | boolean => {
  if (value == null || value === "") return false;
  const parsedBoolean = parseBoolean(value, false);
  if (parsedBoolean) return true;
  if (["0", "false", "no", "off"].includes(String(value).trim().toLowerCase())) {
    return false;
  }
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }
  return value;
};

const parseOrigins = (value: string | undefined) => {
  if (!value || value === "*") {
    return ["*"];
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getLocalIpv4Addresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (
        networkInterface
      ): networkInterface is NonNullable<typeof networkInterface> =>
        networkInterface != null &&
        networkInterface.family === "IPv4" &&
        !networkInterface.internal
    )
    .map((networkInterface) => networkInterface.address);

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const expandDevOrigins = (origins: string[]) => {
  const localIpv4Addresses = getLocalIpv4Addresses();
  const expandedOrigins = new Set(origins);

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!isLoopbackHostname(url.hostname)) {
        continue;
      }

      for (const address of localIpv4Addresses) {
        const localOrigin = new URL(origin);
        localOrigin.hostname = address;
        expandedOrigins.add(localOrigin.origin);
      }
    } catch {
      expandedOrigins.add(origin);
    }
  }

  return [...expandedOrigins];
};

export type ApiConfig = {
  port: number;
  corsOrigins: string[];
  trustProxy: string | number | boolean;
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
};

export const getApiConfig = (env: NodeJS.ProcessEnv = process.env): ApiConfig => ({
  port: parseNumber(env.PORT, 4000, { min: 1 }),
  corsOrigins: expandDevOrigins(parseOrigins(env.CORS_ORIGIN)),
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
  rateLimitEnabled: parseBoolean(env.RATE_LIMIT_ENABLED, true),
  rateLimitWindowMs: parseNumber(env.RATE_LIMIT_WINDOW_MS, 60_000, { min: 1 }),
  rateLimitMaxRequests: parseNumber(env.RATE_LIMIT_MAX_REQUESTS, 60, { min: 1 }),
});

export const createCorsOptions = (origins: string[]): CorsOptions => {
  if (origins.includes("*")) {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  };
};
