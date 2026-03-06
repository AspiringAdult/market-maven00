import { useState, useEffect } from "react";

export default function TickerAutocomplete({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      const res = await fetch(`/api/search?q=${query}`);
      const data = await res.json();
      setResults(data);
    };

    fetchResults();
  }, [query]);

  return (
    <div className="w-full max-w-md">
      <input
        type="text"
        placeholder="Search stock..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border px-3 py-2 rounded"
      />

      {results.length > 0 && (
        <div className="border mt-1 rounded bg-white shadow">
          {results.map((symbol) => (
            <div
              key={symbol}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onSelect(symbol);
                setQuery("");
                setResults([]);
              }}
            >
              {symbol}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}