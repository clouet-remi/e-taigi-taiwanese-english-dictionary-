type EntryWithAudio = {
  audioUrl?: string | null;
};

export const withResolvedAudioUrl = <T extends EntryWithAudio>(entries: T[]) =>
  entries.map((entry) => ({
    ...entry,
    audioUrl: entry.audioUrl ?? null,
  }));
