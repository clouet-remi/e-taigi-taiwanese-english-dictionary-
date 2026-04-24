"use client";

import { useEffect, useState } from "react";
import ResultList from "./ResultList";
import { ResultEntry } from "./result-entry";
import WordModal from "./WordModal";
import {
  buildSearchUrl,
  getApiBaseUrl,
  getResultCountLabel,
  normalizeSearchResults,
} from "./search-client-utils";

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
};

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [selected, setSelected] = useState<ResultEntry | null>(null);

  const apiBase = getApiBaseUrl();

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    const resetSearch = () => {
      setQuery("");
      setResults([]);
      setStatus("idle");
      setSelected(null);
    };

    window.addEventListener("etai-gi:reset-search", resetSearch);
    return () => {
      window.removeEventListener("etai-gi:reset-search", resetSearch);
    };
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setStatus("idle");
      setSelected(null);
      return;
    }

    let isMounted = true;
    setStatus("loading");

    fetch(buildSearchUrl(apiBase, debouncedQuery))
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setResults(normalizeSearchResults(data));
        setStatus("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase, debouncedQuery]);

  return (
    <div className="search-shell">
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l5 5 1.5-1.5-5-5Zm-5.5 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <input
          className="search-input"
          placeholder="Search by Hanzi or English meaning"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="search-meta">
        {status === "loading" && <span>Searching the corpus...</span>}
        {status === "ready" && (
          <span className="chip">{getResultCountLabel(results.length)}</span>
        )}
        {status === "error" && <span>Unable to reach the API.</span>}
      </div>

      <ResultList results={results} status={status} onSelect={setSelected} />
      <WordModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
