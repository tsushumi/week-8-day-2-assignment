const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", sort: "createdAt", order: "desc" },
  { value: "oldest", label: "Oldest first", sort: "createdAt", order: "asc" },
  { value: "price-asc", label: "Price: Low to High", sort: "price", order: "asc" },
  { value: "price-desc", label: "Price: High to Low", sort: "price", order: "desc" },
  { value: "name-asc", label: "Name: A-Z", sort: "name", order: "asc" },
];

export const DEFAULT_FILTERS = { search: "", category: "", sortKey: "newest" };

async function getJSON(path, params, signal) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ""}`, { signal });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  return res.json();
}

/** filters = { search, category, sortKey } */
export function fetchProducts({ page, limit, filters }, signal) {
  const opt = SORT_OPTIONS.find((o) => o.value === filters.sortKey) || SORT_OPTIONS[0];
  const params = { page, limit, sort: opt.sort, order: opt.order };
  if (filters.category) params.category = filters.category;
  if (filters.search.trim()) params.search = filters.search.trim();
  return getJSON("/api/products", params, signal);
}

export async function fetchCategories(signal) {
  return (await getJSON("/api/categories", {}, signal)).data;
}
