import fs from "node:fs";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import path from "node:path";
import process from "node:process";
import net from "node:net";

type Service = {
  name: "api" | "client";
  cwd: string;
  color: string;
  port: number;
  getCommand: (service: Service) => {
    command: string;
    args: string[];
  };
};

const root = process.cwd();
const envPath = path.join(root, ".env");
const nodeExecutable = process.execPath;
const nextCliPath = path.join(root, "client", "node_modules", "next", "dist", "bin", "next");
const reset = "\x1b[0m";
const children: Array<ChildProcessByStdio<null, Readable, Readable>> = [];
let shuttingDown = false;

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const checkPortInUse = (port: number) =>
  new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      resolve(error.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });

const findAvailablePort = async (startingPort: number) => {
  let port = startingPort;
  while (await checkPortInUse(port)) {
    port += 1;
  }
  return port;
};

const prefixOutput = (
  name: string,
  color: string,
  stream: NodeJS.ReadableStream,
  target: NodeJS.WriteStream
) => {
  let buffer = "";
  stream.on("data", (chunk: Buffer | string) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      target.write(`${color}[${name}]${reset} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer) {
      target.write(`${color}[${name}]${reset} ${buffer}\n`);
    }
  });
};

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nShutting down all services...`);
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 500);
};

const startService = (service: Service, apiBaseUrl: string) => {
  const env = {
    ...process.env,
    ...(service.name === "api" ? { PORT: String(service.port) } : {}),
    ...(service.name === "client" ? { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl } : {}),
  };

  const { command, args } = service.getCommand(service);

  console.log(`Starting ${service.name} on port ${service.port}...`);

  const child = spawn(command, args, {
    cwd: service.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push(child);
  prefixOutput(service.name, service.color, child.stdout, process.stdout);
  prefixOutput(service.name, service.color, child.stderr, process.stderr);

  child.on("exit", (code) => {
    if (shuttingDown) return;
    const exitCode = code ?? 0;
    process.stderr.write(
      `${service.color}[${service.name}]${reset} exited with code ${exitCode}\n`
    );

    if (service.name === "api") {
      console.error(`\nAPI server crashed or exited. Stopping all services.`);
      shutdown(exitCode);
      return;
    }

    if (service.name === "client" && exitCode !== 0) {
      console.error(
        `Client failed to start (exit code ${exitCode}). API is still running at ${apiBaseUrl}`
      );
    }
  });
};

loadEnvFile(envPath);

const services: Service[] = [
  {
    name: "api",
    cwd: path.join(root, "api"),
    color: "\x1b[36m",
    port: Number(process.env.API_PORT ?? 5001),
    getCommand: () => ({
      command: nodeExecutable,
      args: ["--import", "tsx", "src/index.ts"],
    }),
  },
  {
    name: "client",
    cwd: path.join(root, "client"),
    color: "\x1b[35m",
    port: Number(process.env.CLIENT_PORT ?? 3003),
    getCommand: (service) => ({
      command: nodeExecutable,
      args: [nextCliPath, "dev", "--port", String(service.port)],
    }),
  },
];

(async () => {
  if (!fs.existsSync(nextCliPath)) {
    console.error(
      `Next.js CLI not found at ${nextCliPath}. Run npm install inside apps/client first.`
    );
    process.exit(1);
  }

  const explicitPorts = {
    api: Boolean(process.env.API_PORT),
    client: Boolean(process.env.CLIENT_PORT),
  };

  for (const service of services) {
    const inUse = await checkPortInUse(service.port);
    if (!inUse) {
      continue;
    }

    const wasExplicit =
      (service.name === "api" && explicitPorts.api) ||
      (service.name === "client" && explicitPorts.client);

    if (wasExplicit) {
      console.error(
        `Port ${service.port} is already in use by another process. ${service.name} cannot start.`
      );
      process.exit(1);
    }

    const originalPort = service.port;
    service.port = await findAvailablePort(service.port + 1);
    console.log(
      `Port ${originalPort} was busy, so ${service.name} will use ${service.port} instead.`
    );
  }

  console.log(
    `Launching services with ports API=${services[0].port}, client=${services[1].port}`
  );

  const apiBaseUrl = `http://localhost:${services[0].port}`;

  for (const service of services) {
    startService(service, apiBaseUrl);
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
})();
