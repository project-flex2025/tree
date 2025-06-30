// @ts-nocheck
/* eslint-disable */
"use client";
import { useState } from "react";

interface SidebarCategory {
  main: string;
  sub: string[];
}

interface SidebarMenuProps {
  categories: SidebarCategory[];
  visibleCategories: string[];
  onToggleCategory: (category: string) => void;
  onToggleSubcategory: (subcategory: string) => void;
  onToggleAll: (checked: boolean) => void;
}

const SidebarMenu = ({
  categories,
  visibleCategories,
  onToggleCategory,
  onToggleSubcategory,
  onToggleAll,
}: SidebarMenuProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleCategory = (main: string) => {
    setExpanded((prev) => (prev === main ? null : main));
  };

  // All checked if every main and every sub is visible
  const allChecked = categories.every(cat =>
    visibleCategories.includes(cat.main) && cat.sub.every(sub => visibleCategories.includes(sub))
  );

  return (
    <div className="sidebar-menu p-2 bg-white rounded shadow-sm" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      <h6 className="fw-bold mb-3">Categories</h6>
      <div className="form-check mb-2">
        <input
          className="form-check-input"
          type="checkbox"
          id="selectAllCategories"
          checked={allChecked}
          onChange={e => onToggleAll(e.target.checked)}
        />
        <label className="form-check-label fw-bold" htmlFor="selectAllCategories">
          Select All
        </label>
      </div>
      <ul className="list-group">
        {categories.map((cat) => {
          const mainChecked = visibleCategories.includes(cat.main);
          return (
            <div key={cat.main}>
              <li className="list-group-item border-0 px-0 py-1">
                <div className="d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`main-${cat.main}`}
                    checked={mainChecked}
                    onChange={() => onToggleCategory(cat.main)}
                  />
                  <label
                    className="form-check-label fw-bold flex-grow-1"
                    htmlFor={`main-${cat.main}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleCategory(cat.main)}
                  >
                    {cat.main}
                  </label>
                  <span className="ms-auto" style={{ cursor: "pointer" }} onClick={() => toggleCategory(cat.main)}>
                    <i className={`fa fa-chevron-${expanded === cat.main ? "up" : "down"}`}></i>
                  </span>
                </div>
              </li>
              {expanded === cat.main && mainChecked && (
                <ul className="list-group ms-3 mb-2">
                  {cat.sub.map((sub) => (
                    <li key={sub} className="list-group-item border-0 px-0 py-1">
                      <div className="d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`sub-${sub}`}
                          checked={visibleCategories.includes(sub)}
                          onChange={() => onToggleSubcategory(sub)}
                        />
                        <label
                          className="form-check-label flex-grow-1"
                          htmlFor={`sub-${sub}`}
                          style={{ cursor: "pointer" }}
                        >
                          {sub}
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </ul>
    </div>
  );
};

export default SidebarMenu;
