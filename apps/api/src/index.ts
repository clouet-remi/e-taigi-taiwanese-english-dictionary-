import type { Server } from "node:http";
import { createApp } from "./app.js";
import { getApiConfig } from "./config.js";

const config = getApiConfig();
const app = createApp(config);
const server = app.listen(config.port);

const closeServerAndExit = (signal: string, instance: Server) => {
  console.log(`${signal} received, closing server gracefully...`);
  instance.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} is already in use. Set PORT env var to use a different port.`
    );
  } else {
    console.error(`Server error: ${error.message}`);
  }
  process.exit(1);
});

server.on("listening", () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

process.on("SIGTERM", () => closeServerAndExit("SIGTERM", server));
process.on("SIGINT", () => closeServerAndExit("SIGINT", server));
