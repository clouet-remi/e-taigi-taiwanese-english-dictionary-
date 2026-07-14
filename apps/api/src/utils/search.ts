const HANZI_REGEX = /[\u3400-\u9fff]/;

export const normalizeEnglish = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const detectMode = (query: string) =>
  HANZI_REGEX.test(query) ? "hanzi" : "english";

export const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);
