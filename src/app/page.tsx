/* eslint-disable */

"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faDownload,
  faSearchPlus,
  faSearchMinus,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";

type KeywordItem = {
  keyword: string;
  url: string;
  description: string;
};

const categories = ["diseases", "proteins", "genes", "chemicals", "drugs"];

const ForceGraph = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const graphData = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordItem[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [results, setResults] = useState<KeywordItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">(
    "down"
  );
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const response = await fetch("/api/graph-data");
      const data = await response.json();
      graphData.current = data;
      initializeGraph();
    };

    loadData();

    return () => {
      if (svgRef.current) {
        svgRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!query.trim() || suggestionSelected) {
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
      } catch (err) {
        console.error("Suggestion fetch error", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query, suggestionSelected]);

  // Fetch final results when user selects a suggestion
  useEffect(() => {
    if (!selectedKeyword) return;

    const fetchResults = async () => {
      setLoadingResults(true);
      try {
        const res = await fetch(
          `/api/search?keyword=${encodeURIComponent(selectedKeyword)}`
        );
        const data: KeywordItem[] = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Result fetch error", err);
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchResults();
  }, [selectedKeyword]);

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setSelectedKeyword(text);
    setSuggestionSelected(true); // prevents further suggestions
    setSuggestions([]); // hide current suggestions
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedKeyword("");
    setResults([]);
    setSuggestionSelected(false); // reset suggestion behavior
  };

  const handleDropdownToggle = () => {
    if (toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200; // Adjust this as per your design

      setDropdownDirection(spaceBelow < dropdownHeight ? "up" : "down");
    }

    setShowDropdown((prev) => !prev);
  };
  const initializeGraph = () => {
    if (!svgRef.current || !graphData.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    // Create a group for all zoomable elements
    gRef.current = svg.append("g");

    // Set up zoom behavior
    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        gRef.current.attr("transform", event.transform);
      });

    svg.call(zoomRef.current);

    const simulation = d3
      .forceSimulation(graphData.current.nodes)
      .force(
        "link",
        d3
          .forceLink(graphData.current.links)
          .id((d: any) => d.id)
          .distance((d: any) => d.distance + 100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = gRef.current
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(graphData.current.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("data-link-id", (d: any) => `${d.source.id}-${d.target.id}`)
      .style("stroke", (d: any) => `rgba(0, 0, 0, ${d.value / 100})`)
      .style("stroke-width", (d: any) => d.thickness)
      .on("mouseover", function (event: any, d: any) {
        const checkedNodes = new Set<string>();
        d3.selectAll<HTMLInputElement, unknown>(".kcb").each(function () {
          const element = this as HTMLInputElement;
          if (element.checked) {
            const id = element.getAttribute("data-id");
            if (id) checkedNodes.add(id);
          }
        });

        if (checkedNodes.size > 0) {
          d3.select(event.currentTarget).style("opacity", 1);
          gRef.current
            .selectAll(".node")
            .style("opacity", (node: any) =>
              node.id === d.source.id ||
              node.id === d.target.id ||
              checkedNodes.has(node.id)
                ? 1
                : 0.4
            );
          gRef.current
            .selectAll(".link")
            .style("opacity", (link: any) =>
              link === d ||
              (checkedNodes.has(link.source.id) &&
                checkedNodes.has(link.target.id))
                ? 1
                : 0.1
            );
        }
      })
      .on("mouseout", function () {
        updateGraph();
      });

    const linkLabels = gRef.current
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(graphData.current.links)
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .text((d: any) => d.linkText);

    const node = gRef.current
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(graphData.current.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("mouseover", function (this: SVGGElement, event: MouseEvent, d: any) {
        d3.select<SVGGElement, unknown>(this).style("opacity", "1");
      })
      .on("mouseout", function () {
        updateGraph();
      });

    node
      .append("circle")
      .attr("r", (d: any) => d.nodeIconSize)
      .style("fill", (d: any) => d.nodeColor);

    node.append("title").text((d: any) => d.keyword);

    node
      .append("foreignObject")
      .attr("x", (d: any) => -d.nodeIconSize)
      .attr("y", (d: any) => -d.nodeIconSize)
      .attr("width", (d: any) => d.nodeIconSize * 2)
      .attr("height", (d: any) => d.nodeIconSize * 2)
      .attr("class", (d: any) => d.id + "_foreignObject1")
      .append("xhtml:div")
      .attr("class", "icon-container")
      .html(
        (d: any) =>
          `<i class="${d.icon}" style="color:${d.iconColor};font-size:${d.nodeIconSize}px;"></i>`
      );

    node
      .append("foreignObject")
      .attr("x", (d: any) => d.nodeIconSize + 5)
      .attr("y", -23)
      .attr("width", 150)
      .attr("height", 60)
      .attr("class", (d: any) => d.id + "_foreignObject2 ")
      .append("xhtml:div")
      .attr(
        "class",
        (d: any) => "checkbox-container " + d.category + "_" + d.nodeType
      )
      .html(
        (d: any) => `
      <input type="checkbox" class="kcb" data-id="${d.id}" onchange="handleCheckboxChange('${d.id}', '${d.keyword}', this.checked)">
      <span class="${d.textClass}">${d.keyword}</span>
    `
      );

    (window as any).handleCheckboxChange = function (
      nodeId: string,
      keyword: string,
      checked: boolean
    ) {
      if (nodeId.endsWith("_main")) {
        graphData.current.nodes.forEach((node: any) => {
          if (node.category === keyword.toLowerCase()) {
            const checkbox = document.querySelector(
              `.${node.id}_foreignObject2 .kcb`
            ) as HTMLInputElement;
            if (checkbox) {
              checkbox.checked = checked;
            }
          }
        });

        graphData.current.links.forEach((link: any) => {
          if (link.source.id === nodeId || link.target.id === nodeId) {
            if (checked) {
              d3.select(
                `[data-link-id="${link.source.id}-${link.target.id}"]`
              ).classed("highlighted", true);
            } else {
              d3.select(
                `[data-link-id="${link.source.id}-${link.target.id}"]`
              ).classed("highlighted", false);
            }
          }
        });
      }
      updateGraph();
    };

    function updateGraph() {
      const checkedNodes = new Set();
      d3.selectAll(".kcb").each(function () {
        const cb = d3.select(this);
        if (cb.property("checked")) {
          checkedNodes.add(cb.attr("data-id"));
        }
      });

      const isAnyChecked = checkedNodes.size > 0;

      link
        .style("display", (d: any) =>
          d.source.visible && d.target.visible ? "block" : "none"
        )
        .classed("highlighted", (d: any) =>
          d3
            .select(`[data-link-id="${d.source.id}-${d.target.id}"]`)
            .classed("highlighted")
        )
        .style("opacity", (d: any) => {
          if (isAnyChecked) {
            const isConnectedToHighlighted =
              checkedNodes.has(d.source.id) && checkedNodes.has(d.target.id);
            return isConnectedToHighlighted ? 1 : 0.1;
          } else {
            return 1;
          }
        });

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2)
        .style("display", (d: any) =>
          d.source.visible && d.target.visible ? "block" : "none"
        );

      node
        .style("display", (d: any) => (d.visible ? "block" : "none"))
        .style("opacity", (d: any) => {
          if (isAnyChecked) {
            return checkedNodes.has(d.id) ? 1 : 0.4;
          } else {
            return 1;
          }
        });
    }

    (window as any).toggleCategory = function (category: string) {
      const isActive = graphData.current.nodes.some(
        (node: any) => node.category === category && node.visible
      );

      graphData.current.nodes.forEach((node: any) => {
        if (node.category === category) {
          node.visible = !isActive;
        }
      });

      updateGraph();
    };

    (window as any).toggleAllCategories = function () {
      const isActive = graphData.current.nodes.every(
        (node: any) => node.visible
      );

      graphData.current.nodes.forEach((node: any) => {
        node.visible = !isActive;
      });

      updateGraph();
    };

    function initializeButtonStates() {
      const categories = [
        "diseases",
        "proteins",
        "genes",
        "chemicals",
        "drugs",
      ];
      categories.forEach((category) => {
        const button = document.getElementById(`button-${category}`);
        if (button) {
          const isActive = graphData.current.nodes.some(
            (node: any) => node.category === category && node.visible
          );
          if (isActive) {
            button.classList.add("applied");
            const icon = button.querySelector("i");
            if (icon) {
              icon.className = "fa fa-eye-slash";
            }
          }
        }
      });

      const allActive = graphData.current.nodes.every(
        (node: any) => node.visible
      );
      const allCategoriesButton = document.getElementById(
        "button-all-categories"
      );
      if (allCategoriesButton && allActive) {
        allCategoriesButton.classList.add("applied");
        const icon = allCategoriesButton.querySelector("i");
        if (icon) {
          icon.className = "fa fa-eye-slash";
        }
      }
    }

    updateGraph();
    initializeButtonStates();

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      bringToFront(d);
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    function bringToFront(d: any) {
      d3.selectAll(".link").sort((a: any, b: any) => {
        if (a.source.id === d.id || a.target.id === d.id) return 1;
        if (b.source.id === d.id || b.target.id === d.id) return -1;
        return 0;
      });
      d3.selectAll(".node").sort((a: any, b: any) => {
        if (a.id === d.id) return 1;
        if (b.id === d.id) return -1;
        return 0;
      });
    }

    (window as any).zoomIn = function () {
      if (zoomRef.current) {
        svg.transition().call(zoomRef.current.scaleBy, 1.2);
      }
    };

    (window as any).zoomOut = function () {
      if (zoomRef.current) {
        svg.transition().call(zoomRef.current.scaleBy, 0.8);
      }
    };
  };

  const handleCategoryToggle = (category: string) => {
    if (typeof window !== "undefined" && (window as any).toggleCategory) {
      (window as any).toggleCategory(category);
    }

    // Toggle local state
    setVisibleCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleToggleAllCategories = () => {
    if (typeof window !== "undefined" && (window as any).toggleAllCategories) {
      (window as any).toggleAllCategories();
    }

    if (visibleCategories.length === categories.length) {
      setVisibleCategories([]);
    } else {
      setVisibleCategories([...categories]);
    }
  };

  const handleZoomIn = () => {
    if (typeof window !== "undefined" && (window as any).zoomIn) {
      (window as any).zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (typeof window !== "undefined" && (window as any).zoomOut) {
      (window as any).zoomOut();
    }
  };

  const handleDownload = () => {
    alert("This button is just for reference only");
  };

  return (
    <div className="container-fluid p-0">
      <div className="container-fluid d-flex flex-column">
        <div className="row">
          {/* Graph Column - col-md-7 */}
          <div className="col-md-7 d-flex flex-column p-0">
            <div ref={containerRef} className="flex-grow-1 position-relative">
              <div className="background-text">
                <h1>Cancer</h1>
                <p>Some Text Here | Some Text Here | Some Text Here</p>
              </div>

              {/* <div className="category-select-container">
                <div className="custom-select">
                  <button
                    ref={toggleRef}
                    className="select-toggle"
                    onClick={handleDropdownToggle}
                  >
                    Select Categories ▼
                  </button>

                  {showDropdown && (
                    <div className={`select-dropdown ${dropdownDirection}`}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={
                            visibleCategories.length === categories.length
                          }
                          onChange={handleToggleAllCategories}
                        />{" "}
                        All Categories
                      </label>

                      {categories.map((category) => (
                        <label key={category} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={visibleCategories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                          />{" "}
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div> */}

              <div className="category-select-container">
                <div className="custom-select">
                  <button
                    ref={toggleRef}
                    className="select-toggle"
                    onClick={handleDropdownToggle}
                  >
                    Select Categories ▼
                  </button>

                  {showDropdown && (
                    <div className={`select-dropdown ${dropdownDirection}`}>
                      <button
                        className={`dropdown-button ${
                          visibleCategories.length === categories.length
                            ? "applied"
                            : ""
                        }`}
                        onClick={handleToggleAllCategories}
                      >
                        <FontAwesomeIcon
                          icon={
                            visibleCategories.length === categories.length
                              ? faEye
                              : faEyeSlash
                          }
                        />{" "}
                        All Categories
                      </button>

                      {categories.map((category) => (
                        <button
                          key={category}
                          className={`category-button ${
                            visibleCategories.includes(category)
                              ? "applied"
                              : ""
                          }`}
                          onClick={() => handleCategoryToggle(category)}
                        >
                          <FontAwesomeIcon
                            icon={
                              visibleCategories.includes(category)
                                ? faEye
                                : faEyeSlash
                            }
                          />{" "}
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="control-row">
                <button className="circle-button" onClick={handleZoomIn}>
                  <FontAwesomeIcon icon={faSearchPlus} />
                </button>
                <button className="circle-button" onClick={handleZoomOut}>
                  <FontAwesomeIcon icon={faSearchMinus} />
                </button>
                <button
                  className="circle-button green"
                  onClick={handleDownload}
                >
                  <FontAwesomeIcon icon={faDownload} />
                </button>
              </div>

              <svg ref={svgRef} className="d3-svg-section"></svg>
            </div>
          </div>

          {/* Content Column - col-md-5 */}
          <div className="col-md-5 p-3 bg-light overflow-auto">
            <div className="search-content-section">
              <div className="container position-relative">
                <div className="search-wrapper mb-3">
                  <i className="fa-solid fa-magnifying-glass search-icon"></i>
                  <input
                    type="text"
                    className="form-control custom-search-input"
                    placeholder="Type to search (e.g. cancer)"
                    value={query}
                    onChange={handleInputChange}
                    aria-label="Search"
                  />
                </div>

                {/* Suggestions Dropdown */}
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

                <div className="content-section ">
                  {/* Results */}
                  {loadingResults && <p className="mt-4">Loading results...</p>}
                  {!loadingResults && results.length > 0 && (
                    <div className="mt-4 data-content">
                      <p>
                        Results for <mark>{selectedKeyword}</mark>:
                      </p>
                      <ul className="list-group">
                        {results.map((item) => (
                          <li key={item.keyword} className="list-group-item">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <strong>{item.keyword}</strong>
                            </a>
                            <p className="mb-0 small text-muted">
                              {item.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForceGraph;
