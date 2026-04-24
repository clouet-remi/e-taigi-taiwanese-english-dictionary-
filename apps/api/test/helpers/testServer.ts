import { createApp } from "../../src/app.ts";
import type { ApiConfig } from "../../src/config.ts";

export const startTestServer = async (config: Partial<ApiConfig>) => {
  const app = createApp({
    port: 0,
    corsOrigins: ["*"],
    trustProxy: false,
    rateLimitEnabled: false,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 60,
    ...config,
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
