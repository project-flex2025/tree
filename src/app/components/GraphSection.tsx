/* eslint-disable */

"use client";
// GraphSection.tsx
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

interface GraphNode {
  id: string;
  category: string;
  [key: string]: any;
}

// const categories = ["diseases", "proteins", "genes", "chemicals", "drugs"];

const GraphSection = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const graphData = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">(
    "down"
  );
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const response = await fetch("/api/graph-data");
      const data = await response.json();
      graphData.current = data;

      const uniqueCategories = Array.from(
        new Set((data.nodes as GraphNode[]).map((node) => node.category))
      );
      setDynamicCategories(uniqueCategories);

      initializeGraph();
    };

    loadData();

    return () => {
      if (svgRef.current) svgRef.current.innerHTML = "";
    };
  }, []);

  console.log("graph data", dynamicCategories);

  const handleDropdownToggle = () => {
    if (toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200;
      setDropdownDirection(spaceBelow < dropdownHeight ? "up" : "down");
    }
    setShowDropdown((prev) => !prev);
  };

  const initializeGraph = () => {
    if (!svgRef.current || !graphData.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    //  const svg = d3
    //    .select(svgRef.current)
    //    .attr("width", width)
    //    .attr("height", height);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

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

    const defaultTransform = d3.zoomIdentity
      .translate(114.95293075308115, 110.566066263289)
      .scale(0.6504939210424966);

    // Call zoom behavior
    svg.call(zoomRef.current);

    // Apply the default zoom and transform
    svg.call(zoomRef.current.transform, defaultTransform);

    // Filter out links where source or target node is missing from nodes list
    const nodeIds = new Set(
      graphData.current.nodes.map((node: any) => node.id)
    );
    graphData.current.links = graphData.current.links.filter((link: any) => {
      // source and target could be string IDs or objects (depending on how data is parsed)
      const sourceId =
        typeof link.source === "string" ? link.source : link.source?.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target?.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

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
      dynamicCategories.forEach((category) => {
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
    if (visibleCategories.length === dynamicCategories.length) {
      setVisibleCategories([]);
    } else {
      setVisibleCategories([...dynamicCategories]);
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
    <div ref={containerRef} className="flex-grow-1 position-relative">
      <div className="background-text">
        <h1>Cancer</h1>
        <p>Some Text Here | Some Text Here | Some Text Here</p>
      </div>
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
                  visibleCategories.length === dynamicCategories.length
                    ? "applied"
                    : ""
                }`}
                onClick={handleToggleAllCategories}
              >
                <FontAwesomeIcon
                  icon={
                    visibleCategories.length === dynamicCategories.length
                      ? faEye
                      : faEyeSlash
                  }
                />{" "}
                All Categories
              </button>
              {dynamicCategories.map((category) => (
                <button
                  key={category}
                  className={`category-button ${
                    visibleCategories.includes(category) ? "applied" : ""
                  }`}
                  onClick={() => handleCategoryToggle(category)}
                >
                  <FontAwesomeIcon
                    icon={
                      visibleCategories.includes(category) ? faEye : faEyeSlash
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
        <button className="circle-button green" onClick={handleDownload}>
          <FontAwesomeIcon icon={faDownload} />
        </button>
      </div>
      <svg ref={svgRef} className="d3-svg-section"></svg>
    </div>
  );
};

export default GraphSection;
