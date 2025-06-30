"use client";
import { useEffect, useState } from "react";

type KeywordItem = {
  keyword: string;
  url: string;
  description: string;
  category?: string;
  relevance?: number;
};

type Props = {
  selectedKeyword: string;
};

const SearchResultsSection = ({ selectedKeyword }: Props) => {
  const [results, setResults] = useState<KeywordItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedKeyword) {
      setResults([]);
      setError(null);
      return;
    }

    const fetchResults = async () => {
      setLoadingResults(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(selectedKeyword)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch results');
        }
        const data: KeywordItem[] = await res.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchResults();
  }, [selectedKeyword]);

  if (!selectedKeyword) {
    return (
      <div className="search-content-section">
        <div className="content-section">
          <div className="empty-state">
            <i className="fa fa-search fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Search for a keyword to see results</h5>
            <p className="text-muted small">
              Enter a biomedical keyword in the search bar above to discover related information and connections.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-content-section">
      <div className="content-section">
        <div className="results-header">
          <h5 className="mb-3">
            Search Results for <mark className="bg-primary text-white px-2 py-1 rounded">{selectedKeyword}</mark>
          </h5>
          {results.length > 0 && (
            <p className="text-muted small mb-3">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loadingResults && (
          <div className="loading-state text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading results...</p>
          </div>
        )}

        {error && (
          <div className="error-state text-center py-4">
            <i className="fa fa-exclamation-triangle fa-2x text-warning mb-2"></i>
            <p className="text-danger">{error}</p>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {!loadingResults && !error && results.length > 0 && (
          <div className="results-list">
            {results.map((item, index) => (
              <div key={`${item.keyword}-${index}`} className="result-item mb-3 p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-1">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none text-primary fw-bold"
                    >
                      {item.keyword}
                    </a>
                  </h6>
                  {item.category && (
                    <span className="badge bg-secondary small">{item.category}</span>
                  )}
                </div>
                {item.description && (
                  <p className="mb-2 text-muted small">{item.description}</p>
                )}
                {item.relevance && (
                  <div className="relevance-indicator">
                    <small className="text-muted">
                      Relevance: {item.relevance}%
                    </small>
                    <div className="progress mt-1" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${item.relevance}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="fa fa-external-link-alt me-1"></i>
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingResults && !error && results.length === 0 && selectedKeyword && (
          <div className="no-results text-center py-4">
            <i className="fa fa-search fa-2x text-muted mb-3"></i>
            <h6 className="text-muted">No results found</h6>
            <p className="text-muted small">
              No results were found for "{selectedKeyword}". Try searching for a different keyword or check your spelling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsSection;
