"use client";
import { useEffect, useState } from "react";
import GraphSection from "../components/GraphSection";
import SearchResultsSection from "../components/SearchResultsSection";
import SidebarMenu from "../components/Sidebar";

type KeywordItem = {
  keyword: string;
  url: string;
  description: string;
};

const MainComponent = () => {
  const [query, setQuery] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false); // 👈

  useEffect(() => {
    if (!query.trim() || suppressSuggestions) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/search?keyword=${encodeURIComponent(query)}`
        );
        const data: KeywordItem[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query, suppressSuggestions]); // 👈 observe both

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedKeyword("");
    setSuppressSuggestions(false); // 👈 allow suggestions again when user types
  };

  const handleSelectSuggestion = (keyword: string) => {
    setQuery(keyword);
    setSelectedKeyword(keyword);
    setSuggestions([]);
    setSuppressSuggestions(true); // 👈 suppress suggestion fetching
  };

  return (
    <div className="container-fluid p-0">
      <div className="container-fluid">
        <div className="* d-flex justify-content-center">
          <div className="search-wrapper my-3 position-relative w-25">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              className="form-control custom-search-input"
              placeholder="Type to search (e.g. cancer)"
              value={query}
              onChange={handleInputChange}
              aria-label="Search"
            />

            {loadingSuggestions && (
              <p className="mt-2">Loading suggestions...</p>
            )}

            {!loadingSuggestions && suggestions.length > 0 && (
              <ul className="list-group position-absolute w-100 z-3">
                {suggestions.map((item) => (
                  <li
                    key={item.keyword}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectSuggestion(item.keyword)}
                  >
                    {item.keyword}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <hr />

        <div className="row">
          <div className="col-md-2 col-lg-2 p-3 bg-light overflow-auto">
           <SidebarMenu />
          </div>
          <div className="col-md-6 col-lg-6">
            <GraphSection />
          </div>
          <div className="col-md-4 col-lg-4 p-3 bg-light overflow-auto">
            <SearchResultsSection selectedKeyword={selectedKeyword} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainComponent;
