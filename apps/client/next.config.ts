import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const allowedDevOrigins = [
  ...new Set(
    [
      ...Object.values(os.networkInterfaces())
        .flat()
        .filter((networkInterface) => networkInterface?.family === "IPv4" && !networkInterface.internal)
        .map((networkInterface) => networkInterface.address),
      ...(process.env.ALLOWED_DEV_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ],
  ),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  turbopack: {
    root: path.resolve(configDir),
  },
};

export default nextConfig;
