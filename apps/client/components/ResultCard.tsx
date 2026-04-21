import { ResultEntry, toEnglishPreview } from "./result-entry";

type ResultCardProps = {
  entry: ResultEntry;
  onSelect: (entry: ResultEntry) => void;
};

export default function ResultCard({ entry, onSelect }: ResultCardProps) {
  return (
    <button
      type="button"
      className="result-card"
      onClick={() => onSelect(entry)}
      aria-label={`Open details for ${entry.hoaBun ?? "entry"}`}
    >
      <div className="result-card-content">
        <div className="result-hanzi">{entry.hoaBun ?? "-"}</div>
        <div className="result-english">{toEnglishPreview(entry.engBun)}</div>
        <div className="result-roman">
          <span className="roman-label">Romaji</span>
          <span>{entry.pojUnicode ?? "-"}</span>
        </div>
      </div>
      <span className="result-chevron" aria-hidden="true">{">"}</span>
    </button>
  );
}
