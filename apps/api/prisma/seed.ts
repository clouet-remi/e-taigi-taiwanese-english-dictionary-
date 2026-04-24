import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type SeedRow = {
  DictWordID: number;
  PojUnicode?: string | null;
  PojInput?: string | null;
  KipUnicode?: string | null;
  KipInput?: string | null;
  HoaBun?: string | null;
  EngBun?: string | null;
  AudioUrl?: string | null;
  audioUrl?: string | null;
};

const prisma = new PrismaClient();
const dataPath = path.resolve(process.cwd(), "..", "..", "data", "data.json");

const readJson = (): SeedRow[] => {
  const raw = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(raw) as SeedRow[];
};

const toEntry = (row: SeedRow) => ({
  id: row.DictWordID,
  pojUnicode: row.PojUnicode ?? null,
  pojInput: row.PojInput ?? null,
  kipUnicode: row.KipUnicode ?? null,
  kipInput: row.KipInput ?? null,
  hoaBun: row.HoaBun ?? null,
  engBun: row.EngBun ?? null,
  audioUrl: row.AudioUrl ?? row.audioUrl ?? null,
});

const main = async () => {
  const rows = readJson();

  await prisma.dictWord.deleteMany();

  const batchSize = 500;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize).map(toEntry);
    await prisma.dictWord.createMany({
      data: batch,
    });
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
