"use client";
import { useEffect, useState } from "react";

type KeywordItem = {
  keyword: string;
  url: string;
  description: string;
};

type Props = {
  selectedKeyword: string;
};

const SearchResultsSection = ({ selectedKeyword }: Props) => {
  const [results, setResults] = useState<KeywordItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    if (!selectedKeyword) return;

    const fetchResults = async () => {
      setLoadingResults(true);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(selectedKeyword)}`);
        const data: KeywordItem[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchResults();
  }, [selectedKeyword]);

  return (
    <div className="search-content-section">
      <div className="content-section">
        {loadingResults && <p className="mt-4">Loading results...</p>}

        {!loadingResults && results.length > 0 && (
          <div className="mt-4 data-content">
            <p>
              Results for <mark>{selectedKeyword}</mark>:
            </p>
            <ul className="list-group">
              {results.map((item) => (
                <li key={item.keyword} className="list-group-item">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <strong>{item.keyword}</strong>
                  </a>
                  <p className="mb-0 small text-muted">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsSection;
