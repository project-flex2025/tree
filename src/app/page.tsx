// @ts-nocheck
/* eslint-disable */
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

interface SidebarCategory {
  main: string;
  sub: string[];
}

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
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [nodeDisplayLimit, setNodeDisplayLimit] = useState<number>(50);
  const [graphData, setGraphData] = useState<any>(null);
  const [sidebarCategories, setSidebarCategories] = useState<SidebarCategory[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setFetchedCategories([]);
      setStaticCategoriesShown(true);
      setHasSearched(false);
      setSuggestionIndex(-1);
      return;
    }

    if (query.trim().length < 3 || suppressSuggestions) {
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        let res = await fetch(`/api/proxy?q=${query}&type=suggest`);
        let data = await res.json();

        if (!data?.suggestions?.length) {
          res = await fetch(`/api/proxy?q=${query}&type=search`);
          data = await res.json();
        }

        if (!data?.suggestions?.length) {
          res = await fetch(
            `/api/proxy?q=${query}&type=search&search_field=all_names`
          );
          data = await res.json();
        }

        setSuggestions(data?.suggestions || []);
        setHasSearched(true);
        setSuggestionIndex(-1);
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
        setHasSearched(false);
        setSuggestionIndex(-1);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionIndex >= 0) {
        const selected = suggestions[suggestionIndex];
        handleSelectSuggestion(selected.general_name, selected.categories);
      }
    }
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
    setSuggestionIndex(-1);
    setHasSearched(false);
  };

  // Fetch graph data when selectedKeyword or nodeDisplayLimit changes
  useEffect(() => {
    const fetchGraphData = async () => {
      const url = `/api/graph-data?keyword=${encodeURIComponent(selectedKeyword || '')}&nodes=${nodeDisplayLimit}`;
      const res = await fetch(url);
      const data = await res.json();
      setGraphData(data);
      // Parse sidebar structure
      if (data.nodes) {
        const mains = data.nodes.filter((n: any) => n.nodeType === 'main');
        const subs = data.nodes.filter((n: any) => n.nodeType === 'sub');
        const categories = mains.map((main: any) => ({
          main: main.keyword,
          sub: subs.filter((sub: any) => sub.category === main.category).map((sub: any) => sub.keyword)
        }));
        setSidebarCategories(categories);
        // Set visibleCategories to all main, sub, and all unique node keywords and categories from the current graph
        const allVisible = [
          ...categories.map((c: { main: string; sub: string[] }) => c.main),
          ...categories.flatMap((c: { main: string; sub: string[] }) => c.sub),
          ...Array.from(new Set(data.nodes.map((n: any) => n.keyword))),
          ...Array.from(new Set(data.nodes.map((n: any) => n.category)))
        ];
        setVisibleCategories(Array.from(new Set(allVisible)));
      } else {
        setSidebarCategories([]);
        setVisibleCategories([]);
      }
    };
    fetchGraphData();
  }, [selectedKeyword, nodeDisplayLimit]);

  // Handler: toggle main category
  const handleToggleCategory = (main: string) => {
    setVisibleCategories((prev: string[]) => {
      const isVisible = prev.includes(main);
      if (isVisible) {
        // Remove main and all its subs
        return prev.filter(cat => cat !== main && !sidebarCategories.find((c: SidebarCategory) => c.main === main)?.sub.includes(cat));
      } else {
        // Add main and all its subs
        const subs = sidebarCategories.find((c: SidebarCategory) => c.main === main)?.sub || [];
        return [...prev, main, ...subs];
      }
    });
  };

  // Handler: toggle subcategory
  const handleToggleSubcategory = (sub: string) => {
    setVisibleCategories((prev: string[]) => {
      const isVisible = prev.includes(sub);
      if (isVisible) {
        return prev.filter(cat => cat !== sub);
      } else {
        return [...prev, sub];
      }
    });
  };

  // Handler: select/deselect all
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setVisibleCategories([
        ...sidebarCategories.map((c: SidebarCategory) => c.main),
        ...sidebarCategories.flatMap((c: SidebarCategory) => c.sub)
      ]);
    } else {
      setVisibleCategories([]);
    }
  };

  return (
    <div className="responsive-container">
      {/* Search Bar Container */}
      <div className="searchbar-container">
        <form className="searchbar-main" onSubmit={(e) => e.preventDefault()}>
          <i className="fa fa-search"></i>
          <div className="autocomplete-wrapper" ref={searchRef}>
            <input
              id="search-input"
              type="text"
              placeholder="Search biomedical keyword..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {loadingSuggestions && (
              <div className="suggestions-loading">
                Loading suggestions...
              </div>
            )}
            {!loadingSuggestions && suggestions.length > 0 && (
              <div id="suggestions" className="suggestions-list">
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`suggestion-item ${idx === suggestionIndex ? 'active' : ''}`}
                    onClick={() => handleSelectSuggestion(item.general_name, item.categories)}
                  >
                    <span className="suggestion-name">{item.general_name}</span>
                    {item.categories && item.categories.map((cat, catIdx) => (
                      <span key={catIdx} className="suggestion-badge">
                        {cat}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {!loadingSuggestions && query.length >= 3 && suggestions.length === 0 && hasSearched && (
              <div className="suggestions-list">
                <div className="suggestion-item">No suggestions found.</div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="row">
          <div className="col-md-2 col-lg-2 p-3 bg-light overflow-auto">
            <SidebarMenu
              categories={sidebarCategories}
              visibleCategories={visibleCategories}
              onToggleCategory={handleToggleCategory}
              onToggleSubcategory={handleToggleSubcategory}
              onToggleAll={handleToggleAll}
            />
          </div>
          <div className="col-md-6 col-lg-6">
            <GraphSection
              selectedKeyword={selectedKeyword}
              graphData={graphData}
              nodeDisplayLimit={nodeDisplayLimit}
              setNodeDisplayLimit={setNodeDisplayLimit}
              visibleCategories={visibleCategories}
            />
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
