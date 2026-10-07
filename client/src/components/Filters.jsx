import { useEffect, useRef, useState } from "react";
import { SORT_OPTIONS, fetchCategories } from "../api.js";

/**
 * Search box (debounced), category dropdown and sort dropdown.
 * `onChange` receives a partial filters object, e.g. { category: "Snacks" }.
 */
export default function Filters({ filters, onChange }) {
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.search);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCategories(ctrl.signal)
      .then(setCategories)
      .catch(() => {
        /* the product list surfaces API errors; the dropdown just stays empty */
      });
    return () => ctrl.abort();
  }, []);

  // Debounce typing so we don't fire a request on every keystroke.
  useEffect(() => {
    if (searchInput === filters.search) return;
    const t = setTimeout(() => onChangeRef.current({ search: searchInput }), 350);
    return () => clearTimeout(t);
  }, [searchInput, filters.search]);

  return (
    <div className="filters">
      <input
        type="search"
        placeholder="Search products by name..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label="Search products"
      />
      <select
        value={filters.category}
        onChange={(e) => onChange({ category: e.target.value })}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.sortKey}
        onChange={(e) => onChange({ sortKey: e.target.value })}
        aria-label="Sort products"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
