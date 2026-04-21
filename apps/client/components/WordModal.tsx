import { useEffect, useState } from "react";
import { ResultEntry, toEnglishLines } from "./result-entry";

type WordModalProps = {
  entry: ResultEntry | null;
  onClose: () => void;
};

export default function WordModal({ entry, onClose }: WordModalProps) {
  const [audioFailed, setAudioFailed] = useState(false);

  useEffect(() => {
    setAudioFailed(false);
  }, [entry?.id, entry?.audioUrl]);

  if (!entry) return null;
  const englishLines = toEnglishLines(entry.engBun);
  const hasAudio = Boolean(entry.audioUrl);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-overline">Taiwanese entry</p>
            <h2 id="modal-title" className="modal-title">
              {entry.hoaBun ?? "Unknown"}
            </h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-english">
          {englishLines.length > 0 ? (
            englishLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
          ) : (
            <p>-</p>
          )}
        </div>
        <div className="modal-roman">
          <div>
            <span className="roman-label">Romaji</span>
            <span>{entry.pojUnicode ?? "-"}</span>
          </div>
        </div>
        <div className="modal-roman">
          <div>
            <span className="roman-label">Audio</span>
            {hasAudio && !audioFailed ? (
              <audio
                controls
                preload="none"
                src={entry.audioUrl ?? undefined}
                onError={() => setAudioFailed(true)}
              >
                Your browser cannot play this audio.
              </audio>
            ) : hasAudio ? (
              <span>Audio temporarily unavailable from the source server.</span>
            ) : (
              <span>No audio available.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
