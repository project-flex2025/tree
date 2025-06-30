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
  faSlidersH,
} from "@fortawesome/free-solid-svg-icons";

import "@fortawesome/fontawesome-svg-core/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";

interface GraphNode {
  id: string;
  category: string;
  nodeType?: string;
  keyword?: string;
  [key: string]: any;
}

interface GraphSectionProps {
  selectedKeyword?: string;
  graphData?: any;
  nodeDisplayLimit?: number;
  setNodeDisplayLimit?: (count: number) => void;
  visibleCategories: string[];
}

const GraphSection = ({ selectedKeyword, graphData: graphDataProp, nodeDisplayLimit: nodeDisplayLimitProp, setNodeDisplayLimit: setNodeDisplayLimitProp, visibleCategories }: GraphSectionProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [localNodeDisplayLimit, setLocalNodeDisplayLimit] = useState(50);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedSubNodeOrder, setSelectedSubNodeOrder] = useState<string[]>([]);

  const nodeDisplayLimit = nodeDisplayLimitProp !== undefined ? nodeDisplayLimitProp : localNodeDisplayLimit;
  const handleSetNodeDisplayLimit = setNodeDisplayLimitProp || setLocalNodeDisplayLimit;

  const graphDataRef = useRef<any>(null);
  const graphData = graphDataProp !== undefined ? graphDataProp : graphDataRef.current;

  const nodeMinLimit = 10;
  const nodeMaxLimit = 200;

  useEffect(() => {
    if (!selectedKeyword && !graphDataProp) {
      setSearchKeyword('');
      fetchAndRender('');
    } else if (selectedKeyword) {
      setSearchKeyword(selectedKeyword);
      fetchAndRender(selectedKeyword);
    } else if (graphDataProp) {
      graphDataRef.current = graphDataProp;
      initializeGraph();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyword, nodeDisplayLimit]);

  // Add effect to update node visibility when visibleCategories changes
  useEffect(() => {
    if (!graphDataRef.current || !graphDataRef.current.nodes) return;
    graphDataRef.current.nodes.forEach((node: any) => {
      if (node.nodeType === 'main' || node.nodeType === 'sub') {
        node.visible = visibleCategories.includes(node.keyword);
      } else {
        node.visible = true;
      }
    });
    if (typeof window !== 'undefined' && gRef.current) {
      updateGraph();
    }
  }, [visibleCategories]);

  function updateGraph() {
    if (!gRef.current) return;
    const checkedNodes = new Set();
    d3.selectAll(".kcb").each(function () {
      const cb = d3.select(this);
      if (cb.property("checked")) {
        checkedNodes.add(cb.attr("data-id"));
      }
    });
    const isAnyChecked = checkedNodes.size > 0;
    gRef.current.selectAll(".link")
      .style("display", (d: any) => d.source.visible && d.target.visible ? "block" : "none")
      .style("opacity", (d: any) => {
        if (isAnyChecked) {
          const isConnectedToHighlighted = checkedNodes.has(d.source.id) && checkedNodes.has(d.target.id);
          return isConnectedToHighlighted ? 1 : 0.1;
        } else {
          return 1;
        }
      });
    gRef.current.selectAll(".link-label")
      .style("display", (d: any) => d.source.visible && d.target.visible ? "block" : "none");
    gRef.current.selectAll(".node")
      .style("display", (d: any) => (d.visible ? "block" : "none"))
      .style("opacity", (d: any) => {
        if (isAnyChecked) {
          return checkedNodes.has(d.id) ? 1 : 0.4;
        } else {
          return 1;
        }
      });
  }

  const fetchAndRender = async (keyword: string) => {
    try {
      const safeKeyword = keyword || '';
      const url = `https://api.publications.ai/dataset/?keyword=${encodeURIComponent(safeKeyword)}&nodes=${nodeDisplayLimit}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log('Graph data:', data); // Debug log
      graphDataRef.current = data;
      const uniqueCategories = Array.from(
        new Set((data.nodes as GraphNode[]).map((node) => node.category))
      );
      setDynamicCategories(uniqueCategories);

      // Find the center node's keyword and set as currentKeyword if no search keyword
      if (!selectedKeyword && data.nodes) {
        const centerNode = data.nodes.find((node: any) => node.nodeType === 'center');
        if (centerNode && centerNode.keyword) {
          setSearchKeyword(centerNode.keyword);
        }
      }

      // Only initialize graph if nodes are present
      if (!data.nodes || data.nodes.length === 0) {
        if (svgRef.current) svgRef.current.innerHTML = '';
        return;
      }

      initializeGraph();
    } catch (error) {
      // Optionally, handle error or show a message
      if (svgRef.current) svgRef.current.innerHTML = '';
    }
  };

  const handleNodeCountChange = (newCount: number) => {
    const validCount = Math.max(nodeMinLimit, Math.min(nodeMaxLimit, newCount));
    const roundedCount = Math.round(validCount / 10) * 10;
    handleSetNodeDisplayLimit(roundedCount);
    // Removed fetchAndRender call here; useEffect will handle fetching
  };

  const initializeGraph = () => {
    if (!svgRef.current || !graphDataRef.current || !containerRef.current) return;

    // Use the original node/link objects for D3 data binding
    const nodes = graphDataRef.current.nodes;
    const links = graphDataRef.current.links || [];

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    gRef.current = svg.append("g");

    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        gRef.current.attr("transform", event.transform);
      });

    const defaultTransform = d3.zoomIdentity
      .translate(33.492426043989326, 62.53974041077123)
      .scale(0.7231243008603);

    svg.call(zoomRef.current);
    svg.call(zoomRef.current.transform, defaultTransform);

    const nodeIds = new Set(nodes.map((node: any) => node.id));
    const filteredLinks = links.filter((link: any) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source?.id;
      const targetId = typeof link.target === "string" ? link.target : link.target?.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d: any) => d.id)
          .distance((d: any) => d.distance ? d.distance + 150 : 200)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = gRef.current
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("data-link-id", (d: any) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`)
      .style("stroke", (d: any) => `rgba(0,0,0,${d.opacity || 0.3})`)
      .style("stroke-width", (d: any) => d.thickness || 1)
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
      .data(filteredLinks)
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .text((d: any) => d.linkText || "");

    const node = gRef.current
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
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

    // Create different node types based on nodeType
    node.each(function(this: SVGGElement, d: any) {
      const g = d3.select(this);
      if (d.nodeType === "center" || d.nodeType === "main") {
        const label = d.keyword || '';
        const charWidth = d.nodeType === "center" ? 17 : 13;
        const iconSpace = d.nodeType === "center" ? 40 : 34;
        const minWidth = d.nodeType === "center" ? 180 : 108;
        const maxWidth = 370;
        const buttonWidth = Math.max(minWidth, Math.min(maxWidth, label.length * charWidth + iconSpace + 30));
        const buttonHeight = d.nodeType === "center" ? 62 : 40;

        g.append("foreignObject")
          .attr("x", -buttonWidth / 2 - 1)
          .attr("y", -buttonHeight / 2 - 1)
          .attr("width", buttonWidth + 2)
          .attr("height", buttonHeight + 2)
          .append("xhtml:button")
          .attr("class", d.nodeType === "center" ? "center-keyword-button" : "main-node-button")
          .style("width", buttonWidth + "px")
          .style("height", buttonHeight + "px")
          .style("color", "#fff")
          .style("background", d.nodeColor || "#1976d2")
          .style("padding", d.nodeType === "center" ? "0.25em 1.25em 0.25em 1em" : "0.18em 1em 0.18em 0.9em")
          .style("gap", "0.38em")
          .html(
            `<i class="${d.icon || 'fa fa-circle'}" style="color:${d.iconColor || '#fff'};margin-right:0.38em"></i> <span>${label}</span>`
          );
      } else {
        g.append("circle")
          .attr("r", d.nodeIconSize || 8)
          .style("fill", d.nodeColor || "#1976d2");

        g.append("foreignObject")
          .attr("x", -d.nodeIconSize)
          .attr("y", -d.nodeIconSize)
          .attr("width", d.nodeIconSize * 2)
          .attr("height", d.nodeIconSize * 2)
          .attr("class", d.id + "_foreignObject1")
          .append("xhtml:div")
          .attr("class", "icon-container")
          .html(
            `<i class="${d.icon || 'fa fa-circle'}" style="color:${d.iconColor || '#fff'};font-size:${d.nodeIconSize}px;"></i>`
          );

        g.append("foreignObject")
          .attr("x", d.nodeIconSize + 1)
          .attr("y", -23)
          .attr("width", 150)
          .attr("height", 60)
          .attr("class", d.id + "_foreignObject2")
          .append("xhtml:div")
          .attr("class", "checkbox-container " + d.category + "_" + d.nodeType)
          .html(
            `<input type="checkbox" class="kcb" data-id="${d.id}" onchange="handleCheckboxChange('${d.id}', '${d.keyword}', this.checked)">
             <span class="${d.textClass || 'medium-text'}">${d.keyword}</span>`
          );
      }
    });

    (window as any).handleCheckboxChange = function (
      nodeId: string,
      keyword: string,
      checked: boolean
    ) {
      const nodeObj = graphDataRef.current.nodes.find((n: any) => n.id === nodeId);
      if (nodeObj && nodeObj.nodeType === "sub") {
        if (checked) {
          if (!selectedSubNodeOrder.includes(nodeId)) {
            setSelectedSubNodeOrder(prev => [...prev, nodeId]);
          }
        } else {
          setSelectedSubNodeOrder(prev => prev.filter(id => id !== nodeId));
        }
        drawSelectedPath();
      }
      updateGraph();
    };

    function drawSelectedPath() {
      if (!gRef.current) return;
      
      gRef.current.selectAll(".selected-path-line").remove();
      if (selectedSubNodeOrder.length > 1) {
        const coords = selectedSubNodeOrder
          .map(id => {
            const n = graphDataRef.current.nodes.find((node: any) => node.id === id);
            return n && n.x !== undefined && n.y !== undefined ? [n.x, n.y] : null;
          })
          .filter(d => d);
        
        for (let i = 0; i < coords.length - 1; ++i) {
          gRef.current.append("line")
            .attr("class", "selected-path-line")
            .attr("x1", coords[i]![0])
            .attr("y1", coords[i]![1])
            .attr("x2", coords[i + 1]![0])
            .attr("y2", coords[i + 1]![1]);
        }
      }
    }

    (window as any).toggleCategory = function (category: string) {
      const isActive = graphDataRef.current.nodes.some(
        (node: any) => node.category === category && node.visible
      );

      graphDataRef.current.nodes.forEach((node: any) => {
        if (node.category === category) {
          node.visible = !isActive;
        }
      });

      updateGraph();
    };

    (window as any).toggleAllCategories = function () {
      const isActive = graphDataRef.current.nodes.every(
        (node: any) => node.visible
      );

      graphDataRef.current.nodes.forEach((node: any) => {
        if (node.nodeType !== "center") {
          node.visible = !isActive;
        }
      });

      updateGraph();
    };

    function initializeButtonStates() {
      dynamicCategories.forEach((category) => {
        const button = document.getElementById(`button-${category}`);
        if (button) {
          const isActive = graphDataRef.current.nodes.some(
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

      const allActive = graphDataRef.current.nodes.every(
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
      
      drawSelectedPath();
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
    alert("Download functionality coming soon!");
  };

  return (
    <div ref={containerRef} className="flex-grow-1 position-relative">
      {/* Background Text */}
      <div className="background-text">
        <h1 id="header-keyword">{searchKeyword || "Search for a keyword"}</h1>
        <p id="header-categories">graph generated by intree.ai</p>
      </div>

      {/* Category Buttons */}
      {/* <div id="button-container" className={`button-container ${showCategories ? 'show' : 'hide'}`}>
        {dynamicCategories.map((category) => {
          const isActive = graphDataRef.current?.nodes?.some(
            (node: any) => node.category === category && node.visible
          );
          return (
            <button
              key={category}
              className={`category-button${isActive ? ' applied' : ''}`}
              id={`button-${category}`}
              onClick={() => handleCategoryToggle(category)}
            >
              <i className={`fa ${isActive ? 'fa-eye-slash' : 'fa-eye'}`}></i> {category}
            </button>
          );
        })}
        {(() => {
          const allActive = graphDataRef.current?.nodes?.every((node: any) => node.visible);
          return (
            <button
              className={`category-button${allActive ? ' applied' : ''}`}
              id="button-all-categories"
              onClick={handleToggleAllCategories}
            >
              <i className={`fa ${allActive ? 'fa-eye-slash' : 'fa-eye'}`}></i> All Categories
            </button>
          );
        })()}
      </div>
      <button
        id="toggle-categories-btn"
        className="settings-fab"
        title="Show/Hide categories"
        onClick={() => setShowCategories(!showCategories)}
      >
        <FontAwesomeIcon icon={faSlidersH} className="settings-fab-icon" />
      </button> */}

      {/* Node Control Panel */}
      <div className="node-control-panel" id="nodeControlPanel">
        <button
          id="btnDecNode"
          title="Show fewer nodes"
          onClick={() => handleNodeCountChange(nodeDisplayLimit - 10)}
        >
          <i className="fa fa-minus"></i>
        </button>
        <input
          id="nodeCountInput"
          className="node-count-input"
          type="number"
          min={nodeMinLimit}
          max={nodeMaxLimit}
          step={10}
          value={nodeDisplayLimit}
          onChange={(e) => handleNodeCountChange(parseInt(e.target.value) || nodeDisplayLimit)}
        />
        <button
          id="btnIncNode"
          title="Show more nodes"
          onClick={() => handleNodeCountChange(nodeDisplayLimit + 10)}
        >
          <i className="fa fa-plus"></i>
        </button>
      </div>

      {/* Control Buttons */}
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
