import { useState } from "react";

const dummyCategories = [
  {
    id: "cat1",
    name: "Diseases",
    subcategories: ["Cancer", "Diabetes", "Hypertension"],
  },
  {
    id: "cat2",
    name: "Proteins",
    subcategories: ["Protein A", "Protein B"],
  },
  {
    id: "cat3",
    name: "Genes",
    subcategories: ["Gene X", "Gene Y", "Gene Z"],
  },
];

const SidebarMenu = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    []
  );

  const toggleCategory = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const handleCheckboxChange = (subcategory: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory)
        ? prev.filter((item) => item !== subcategory)
        : [...prev, subcategory]
    );
  };

  const isMainCategorySelected = (catId: string) => {
    const cat = dummyCategories.find((c) => c.id === catId);
    return cat?.subcategories.some((sub) =>
      selectedSubcategories.includes(sub)
    );
  };

  return (
    <div className="sidebar-menu">
      <ul className="list-group">
        {dummyCategories.map((cat) => {
          const isActive = isMainCategorySelected(cat.id);
          return (
            <div key={cat.id}>
              <li className={`list-group-item ${isActive ? "active" : ""}`}>
                <div
                  className="fw-bold d-flex align-items-center gap-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleCategory(cat.id)}
                >
                  <label className="custom-radio-style mb-0 d-flex align-items-center gap-2">
                    <input type="checkbox" checked={isActive} readOnly />
                  </label>
                  {cat.name}
                  <span className="ms-auto">
                    <i
                      className={`fa fa-chevron-${
                        expanded === cat.id ? "up" : "down"
                      }`}
                    ></i>
                  </span>
                </div>
              </li>

              {expanded === cat.id && (
                <ul className="list-group mt-2">
                  {cat.subcategories.map((sub, idx) => (
                    <li
                      key={idx}
                      className="list-group-item list-group-item-light d-flex align-items-center gap-2"
                    >
                      <label className="custom-radio-style mb-0 d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSubcategories.includes(sub)}
                          onChange={() => handleCheckboxChange(sub)}
                        />
                        <span>{sub}</span>
                      </label>
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
