"use client";
import { useEffect, useState, useRef } from "react";
import GraphSection from "./components/GraphSection";
import SearchResultsSection from "./components/SearchResultsSection";
import SidebarMenu from "./components/Sidebar";

type KeywordItem = {
  keyword: string;
  id: string;
  general_name: string;
  categories: string[];
};

const MainComponent = () => {
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState<string[]>([]);
  const [staticCategoriesShown, setStaticCategoriesShown] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setFetchedCategories([]);
      setStaticCategoriesShown(true);
      setHasSearched(false); // reset
      return;
    }

    // Only proceed if user has entered at least 3 characters
    if (query.trim().length < 3 || suppressSuggestions) {
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        let res = await fetch(`/api/proxy?q=${query}&type=suggest`);
        let data = await res.json();
        console.log("data 1", data);

        if (!data?.suggestions?.length) {
          res = await fetch(`/api/proxy?q=${query}&type=search`);
          data = await res.json();
          console.log("data 2", data);
        }

        if (!data?.suggestions?.length) {
          res = await fetch(
            `/api/proxy?q=${query}&type=search&search_field=all_names`
          );
          data = await res.json();
          console.log("data 3", data);
        }

        setSuggestions(data?.suggestions || []);
        setHasSearched(true);
      } catch (err) {
        console.error("Suggestion fetching failed:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query, suppressSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSuggestions([]);
        setHasSearched(false); // 👈 prevent "no suggestions" on outside click
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedKeyword("");
    setSuppressSuggestions(false);
  };

  const handleSelectSuggestion = (
    generalName: string,
    categories: string[]
  ) => {
    setQuery(generalName);
    setSelectedKeyword(generalName);
    setSuggestions([]);
    setSuppressSuggestions(true);
    setFetchedCategories(categories);
    setStaticCategoriesShown(false);
  };

  // Random color palette for category tags (by index)
  const badgeColors = [
    "#e74c3c",
    "#3498db",
    "#8e44ad",
    "#27ae60",
    "#f39c12",
    "#1abc9c",
    "#2c3e50",
  ];

  return (
    <div className="container-fluid p-0">
      <div className="container-fluid">
        <div className=" d-flex justify-content-center">
          <div
            className="search-wrapper my-3 position-relative"
            ref={searchRef}
          >
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              className="form-control custom-search-input"
              placeholder="Search for....."
              value={query}
              onChange={handleInputChange}
              aria-label="Search"
            />

            {loadingSuggestions && (
              <p
                className="mt-2 position-absolute bg-white p-2 rounded shadow-sm"
                style={{ top: "100%", left: 0, zIndex: 100 }}
              >
                Loading suggestions...
              </p>
            )}

            {!loadingSuggestions && suggestions.length > 0 && (
              <ul className="list-group position-absolute w-100 mt-5 z-3">
                {suggestions.map((item) => (
                  <li
                    key={item.id}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      handleSelectSuggestion(item.general_name, item.categories)
                    }
                  >
                    <div className="d-flex">
                      <span className="fw-bold">{item.general_name}</span>
                      <div className="d-flex suggestion-badge flex-wrap gap-1 mt-1">
                        {item.categories.slice(0, 3).map((cat, idx) => (
                          <span
                            key={idx}
                            className="badge pb-1"
                            style={{
                              backgroundColor:
                                badgeColors[idx % badgeColors.length],
                              color: "#fff",
                              fontSize: "0.75rem",
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                        {item.categories.length > 3 && (
                          <span
                            className="badge bg-secondary"
                            style={{ fontSize: "0.75rem" }}
                          >
                            & more
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loadingSuggestions &&
              query.length >= 3 &&
              suggestions.length === 0 &&
              hasSearched && (
                <div
                  className="position-absolute bg-white p-2 rounded shadow-sm text-start w-100"
                  style={{ top: "100%", left: 0, zIndex: 100 }}
                >
                  No suggestions found.
                </div>
              )}
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-md-2 col-lg-2 p-3 bg-light overflow-auto">
            <SidebarMenu
              categories={fetchedCategories}
              showStatic={staticCategoriesShown}
            />
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
