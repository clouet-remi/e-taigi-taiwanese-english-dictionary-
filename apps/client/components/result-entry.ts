export type EngBunValue = string | string[] | null;

export type ResultEntry = {
  id: number;
  hoaBun: string | null;
  engBun: EngBunValue;
  pojUnicode: string | null;
  kipUnicode: string | null;
  audioUrl?: string | null;
};

export const toEnglishLines = (engBun: EngBunValue) => {
  if (Array.isArray(engBun)) {
    return engBun.filter(Boolean);
  }
  return engBun ? [engBun] : [];
};

export const toEnglishPreview = (engBun: EngBunValue) => {
  const lines = toEnglishLines(engBun);
  if (lines.length === 0) return "-";
  if (lines.length === 1) return lines[0];
  return `${lines[0]} (+${lines.length - 1} more)`;
};
