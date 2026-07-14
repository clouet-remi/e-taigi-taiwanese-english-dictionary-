import fs from "node:fs/promises";
import path from "node:path";

type AudioRow = {
  DictWordID?: number;
  HoaBun?: string | null;
  EngBun?: string | null;
  AudioUrl?: string | null;
  audioUrl?: string | null;
};

type ManifestEntry = {
  id: number;
  hoaBun: string | null;
  engBun: string | null;
  audioUrl: string;
  fileName: string;
  outputPath: string;
  size?: number;
  downloadedAt?: string;
  error?: string;
  updatedAt?: string;
};

const root = process.cwd();
const defaultInput = path.join(root, "data", "data.json");
const defaultOutputDir = path.join(root, "data", "audio-backups");
const defaultFlags = path.join(root, "data", "audio-backups.flags.jsonl");
const defaultState = path.join(root, "data", "audio-backups.state.json");
const defaultManifest = path.join(root, "data", "audio-backups.manifest.json");

const args = new Set(process.argv.slice(2));
const getArgValue = (name: string, fallback: string) => {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 1);
};

const inputPath = getArgValue("--input", defaultInput);
const outputDir = getArgValue("--output-dir", defaultOutputDir);
const flagsPath = getArgValue("--flags", defaultFlags);
const statePath = getArgValue("--state", defaultState);
const manifestPath = getArgValue("--manifest", defaultManifest);
const maxItems = Number(getArgValue("--max-items", "0"));
const sleepMs = Number(getArgValue("--sleep-ms", "100"));
const timeoutMs = Number(getArgValue("--timeout-ms", "20000"));
const reset = args.has("--reset");
const dryRun = args.has("--dry-run");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const removeIfExists = async (targetPath: string) => {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {}
};

const loadJson = async (filePath: string) =>
  JSON.parse(await fs.readFile(filePath, "utf8")) as AudioRow[];

const appendJsonl = async (filePath: string, payload: unknown) => {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
};

const loadState = async () => {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as { processedIds?: number[] };
    return new Set(parsed.processedIds ?? []);
  } catch {
    return new Set<number>();
  }
};

const saveState = async (processedIds: Set<number>) => {
  await fs.writeFile(
    statePath,
    JSON.stringify(
      {
        inputPath,
        outputDir,
        processedIds: Array.from(processedIds),
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
};

const loadManifest = async () => {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, ManifestEntry>;
  } catch {
    return {} as Record<string, ManifestEntry>;
  }
};

const saveManifest = async (manifest: Record<string, ManifestEntry>) => {
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
};

const extensionFromUrl = (audioUrl: string) => {
  try {
    const pathname = new URL(audioUrl).pathname;
    const ext = path.extname(pathname);
    return ext || ".mp3";
  } catch {
    return ".mp3";
  }
};

const fetchWithTimeout = async (audioUrl: string, requestTimeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(audioUrl, {
      signal: controller.signal,
      headers: {
        "user-agent": "TaiwaneseDictionaryBot/1.0 (+contact: local backup)",
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const main = async () => {
  if (reset) {
    await removeIfExists(outputDir);
    await removeIfExists(flagsPath);
    await removeIfExists(statePath);
    await removeIfExists(manifestPath);
  }

  await ensureDir(outputDir);

  const rows = await loadJson(inputPath);
  if (!Array.isArray(rows)) {
    throw new Error("Input file must be a JSON array.");
  }

  const processedIds = await loadState();
  const manifest = await loadManifest();
  const withAudio = rows.filter(
    (row): row is AudioRow & { DictWordID: number } =>
      row.DictWordID != null && Boolean(row.AudioUrl ?? row.audioUrl)
  );

  if (dryRun) {
    console.log(`[audio-backup] would process ${withAudio.length} rows with audio.`);
    return;
  }

  console.log(`[audio-backup] starting | entries=${withAudio.length} | outputDir=${outputDir}`);

  let count = 0;

  for (const row of withAudio) {
    if (maxItems > 0 && count >= maxItems) break;

    const id = row.DictWordID;
    const audioUrl = row.AudioUrl ?? row.audioUrl;
    if (!audioUrl) {
      continue;
    }

    const ext = extensionFromUrl(audioUrl);
    const fileName = `${String(id).padStart(5, "0")}${ext}`;
    const outputPath = path.join(outputDir, fileName);

    if (processedIds.has(id)) {
      count += 1;
      continue;
    }

    console.log(`[audio-backup] downloading ${id} -> ${fileName}`);

    try {
      const response = await fetchWithTimeout(audioUrl, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, bytes);

      manifest[String(id)] = {
        id,
        hoaBun: row.HoaBun ?? null,
        engBun: row.EngBun ?? null,
        audioUrl,
        fileName,
        outputPath,
        size: bytes.byteLength,
        downloadedAt: new Date().toISOString(),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      await appendJsonl(flagsPath, {
        type: "audio-download-error",
        id,
        audioUrl,
        reason,
      });

      manifest[String(id)] = {
        id,
        hoaBun: row.HoaBun ?? null,
        engBun: row.EngBun ?? null,
        audioUrl,
        fileName,
        outputPath,
        error: reason,
        updatedAt: new Date().toISOString(),
      };
    }

    processedIds.add(id);
    count += 1;
    await saveState(processedIds);
    await saveManifest(manifest);

    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }

  console.log(
    `[audio-backup] finished | processed=${processedIds.size} | manifest=${manifestPath}`
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
