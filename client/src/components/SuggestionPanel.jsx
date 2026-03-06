export default function SuggestionPanel({ onSelect }) {

  const trending = [
    "AAPL",
    "TSLA",
    "NVDA",
    "MSFT",
    "AMZN"
  ];

  const indian = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS"
  ];

  const renderGroup = (title, stocks) => (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>

      <div className="flex flex-wrap gap-2">
        {stocks.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 border rounded">
      {renderGroup("Trending Stocks", trending)}
      {renderGroup("Indian Bluechips", indian)}
    </div>
  );
}