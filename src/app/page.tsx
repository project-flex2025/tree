"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faSearchPlus,
  faSearchMinus,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";

const categories = ["diseases", "proteins", "genes", "chemicals", "drugs"];

export default function ForceGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const graphData = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

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
      .scaleExtent([0.5, 8])
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
          .distance((d: any) => d.distance + 150)
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
        const checkedNodes = new Set();
        d3.selectAll(".kcb").each(function () {
          const cb = d3.select(this);
          if (cb.property("checked")) {
            checkedNodes.add(cb.attr("data-id"));
          }
        });

        if (checkedNodes.size > 0) {
          d3.select(this).style("opacity", 1);
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
      .on("mouseover", function (event: any, d: any) {
        d3.select(this).style("opacity", 1);
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
      const button = document.getElementById(`button-${category}`);
      if (!button) return;

      const isActive = button.classList.contains("applied");

      graphData.current.nodes.forEach((node: any) => {
        if (node.category === category) {
          node.visible = !isActive;
        }
      });

      button.classList.toggle("applied");
      const icon = button.querySelector("i");
      if (icon) {
        icon.className = isActive ? "fa fa-eye" : "fa fa-eye-slash";
      }

      updateGraph();
    };

    (window as any).toggleAllCategories = function () {
      const button = document.getElementById("button-all-categories");
      if (!button) return;

      const isActive = button.classList.contains("applied");

      graphData.current.nodes.forEach((node: any) => {
        node.visible = !isActive;
      });

      button.classList.toggle("applied");
      const icon = button.querySelector("i");
      if (icon) {
        icon.className = isActive ? "fa fa-eye" : "fa fa-eye-slash";
      }

      const categories = [
        "diseases",
        "proteins",
        "genes",
        "chemicals",
        "drugs",
      ];
      categories.forEach((category) => {
        const categoryButton = document.getElementById(`button-${category}`);
        if (categoryButton) {
          if (isActive) {
            categoryButton.classList.remove("applied");
            const catIcon = categoryButton.querySelector("i");
            if (catIcon) {
              catIcon.className = "fa fa-eye";
            }
          } else {
            categoryButton.classList.add("applied");
            const catIcon = categoryButton.querySelector("i");
            if (catIcon) {
              catIcon.className = "fa fa-eye-slash";
            }
          }
        }
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
      <div className="bg-primary text-white p-3 d-flex align-items-center">
        <p className="mb-0">Header</p>
      </div>
      <div className="bg-primary text-white p-3 d-flex align-items-center">
        <p className="mb-0">Header</p>
      </div>
      <div className="container-fluid d-flex flex-column">
        <div className="row">
          {/* Graph Column - col-md-7 */}
          <div className="col-md-7 d-flex flex-column p-0">
            <div ref={containerRef} className="flex-grow-1 position-relative">
              <div className="background-text">
                <h1>Cancer</h1>
                <p>Some Text Here | Some Text Here | Some Text Here</p>
              </div>

              <div className="button-container">
                {categories.map((category) => (
                  <button
                    key={category}
                    className="category-button"
                    id={`button-${category}`}
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
                <button
                  className="category-button"
                  id="button-all-categories"
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
              </div>

              <div className="controls-container">
                <button className="control-button" onClick={handleZoomIn}>
                  <FontAwesomeIcon icon={faSearchPlus} /> Zoom In
                </button>
                <button className="control-button" onClick={handleZoomOut}>
                  <FontAwesomeIcon icon={faSearchMinus} /> Zoom Out
                </button>
              </div>

              <div className="download-container">
                <button className="download-button" onClick={handleDownload}>
                  <FontAwesomeIcon icon={faDownload} /> Download PNG
                </button>
              </div>

              <svg ref={svgRef} className=""></svg>
            </div>
          </div>

          {/* Content Column - col-md-5 */}
          <div className="col-md-5 p-3 bg-light overflow-auto">
            <div className="content-section">
              <h2>Cancer Disease Information</h2>
              <p>
                Cancer is a group of diseases involving abnormal cell growth
                with the potential to invade or spread to other parts of the
                body. These contrast with benign tumors, which do not spread.
              </p>

              <h3 className="mt-4">Key Statistics</h3>
              <ul>
                <li>Estimated new cases in 2023: 1,958,310</li>
                <li>Estimated deaths in 2023: 609,820</li>
                <li>5-year survival rate: 68% for all cancers combined</li>
              </ul>

              <h3 className="mt-4">Common Types</h3>
              <div className="row">
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-body">
                      <h5 className="card-title">Breast Cancer</h5>
                      <p className="card-text">
                        Most common cancer in women worldwide, with about 2.3
                        million new cases in 2020.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-body">
                      <h5 className="card-title">Lung Cancer</h5>
                      <p className="card-text">
                        Leading cause of cancer death, accounting for about 1.8
                        million deaths in 2020.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="mt-4">Treatment Options</h3>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Treatment</th>
                    <th>Description</th>
                    <th>Used For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Surgery</td>
                    <td>Physical removal of tumor</td>
                    <td>Solid tumors</td>
                  </tr>
                  <tr>
                    <td>Chemotherapy</td>
                    <td>Drugs that kill rapidly dividing cells</td>
                    <td>Systemic disease</td>
                  </tr>
                  <tr>
                    <td>Radiation</td>
                    <td>High-energy particles to destroy cancer cells</td>
                    <td>Localized tumors</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <style jsx global>{`
          body {
            font-family: sans-serif;
            margin: 0;
            overflow: hidden;
          }

          .node {
            cursor: pointer;
          }

          .node circle {
            fill: #fff;
            stroke: #efefef;
            stroke-width: 1.5px;
          }

          .node text {
            font: 10px sans-serif;
          }

          .link {
            fill: none;
          }

          .checkbox-container {
            display: flex;
            align-items: center;
            padding: 5px 10px;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 15px;
            box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
          }

          .checkbox-container input {
            margin-right: 5px;
          }

          .icon-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
          }

          .large-text {
            font-size: 18px;
          }

          .medium-text {
            font-size: 16px;
          }

          .small-text {
            font-size: 13px;
          }

          .kcb {
            width: 18px;
            height: 18px;
          }

          .highlighted {
            stroke: #4481d7 !important;
            stroke-width: 3px !important;
          }

          .button-container {
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 10;
          }

          .category-button {
            padding: 5px 10px;
            margin: 5px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
          }

          .category-button:hover {
            background-color: #0056b3;
          }

          .category-button.applied {
            background-color: #28a745;
          }

          .category-button.applied:hover {
            background-color: #218838;
          }

          .main_foreignObject2 .kcb {
            display: none;
          }

          .main_foreignObject2 .checkbox-container {
            display: block;
            text-align: center;
          }

          foreignObject div.diseases_main {
            background-color: rgb(214, 39, 40);
            color: #fff;
          }

          foreignObject div.proteins_main {
            background-color: rgb(255, 127, 14);
            color: #fff;
          }

          foreignObject div.genes_main {
            background-color: rgb(44, 160, 44);
            color: #fff;
          }

          foreignObject div.chemicals_main {
            background-color: rgb(148, 103, 189);
            color: #fff;
          }

          foreignObject div.drugs_main {
            background-color: rgb(140, 86, 75);
            color: #fff;
          }

          .highlighted {
            stroke: red;
            stroke-width: 3px;
          }

          .controls-container {
            position: absolute;
            bottom: 20px;
            left: 20px;
            z-index: 10;
            display: flex;
            flex-direction: column;
          }

          .control-button {
            padding: 5px 10px;
            margin: 5px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
          }

          .control-button:hover {
            background-color: #0056b3;
          }

          .background-text {
            pointer-events: none;
            position: absolute;
            width: 100%;
            height: 100%;
            text-align: center;
            top: 88%;
            transform: translateY(-50%);
            z-index: -1;
          }

          .background-text h1 {
            font-family: Arial;
            font-size: 150px;
            color: black;
            opacity: 0.1;
            margin: 0;
          }

          .background-text p {
            font-family: Arial;
            font-size: 25px;
            color: black;
            opacity: 0.2;
            margin: 0;
          }

          .download-container {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 10;
            display: flex;
            flex-direction: column;
          }

          .download-button {
            padding: 5px 10px;
            margin: 5px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
          }

          .download-button:hover {
            background-color: #218838;
          }

          .content-section {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
          }
        `}</style>
      </div>
    </div>
  );
}
