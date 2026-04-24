import { ResultEntry } from "./result-entry";
import ResultCard from "./ResultCard";

type ResultListProps = {
  results: ResultEntry[];
  status: "idle" | "loading" | "ready" | "error";
  onSelect: (entry: ResultEntry) => void;
};

export default function ResultList({ results, status, onSelect }: ResultListProps) {
  return (
    <section className="results">
      {(status === "ready" || status === "error") && results.length === 0 ? (
        <div className="empty-state">No matches yet. Try another query.</div>
      ) : null}
      {results.map((entry) => (
        <ResultCard key={entry.id} entry={entry} onSelect={onSelect} />
      ))}
    </section>
  );
}
