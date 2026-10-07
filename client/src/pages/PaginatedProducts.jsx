import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FILTERS, fetchProducts } from "../api.js";
import Filters from "../components/Filters.jsx";
import Pagination from "../components/Pagination.jsx";
import ProductCard from "../components/ProductCard.jsx";

const LIMIT = 10;

export default function PaginatedProducts() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: [], metadata: null, loading: true, error: null });

  // Any filter/sort change goes back to page 1.
  const handleFilterChange = useCallback((partial) => {
    setFilters((f) => ({ ...f, ...partial }));
    setPage(1);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchProducts({ page, limit: LIMIT, filters }, ctrl.signal)
      .then(({ data, metadata }) => {
        // Landed past the last page (e.g. data changed) -> jump to the last real page.
        if (data.length === 0 && metadata.totalPages > 0 && page > metadata.totalPages) {
          setPage(metadata.totalPages);
          return;
        }
        setState({ data, metadata, loading: false, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });

    return () => ctrl.abort(); // ignore stale responses when page/filters change quickly
  }, [page, filters]);

  const goToPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data, metadata, loading, error } = state;

  return (
    <section>
      <Filters filters={filters} onChange={handleFilterChange} />

      {error && (
        <div className="error" role="alert">
          Could not load products: {error}{" "}
          <button type="button" onClick={() => setFilters((f) => ({ ...f }))}>
            Retry
          </button>
        </div>
      )}

      {loading && <p className="status" role="status">Loading products...</p>}

      {!loading && !error && data.length === 0 && <p className="status">No products found.</p>}

      <div className={`grid ${loading ? "dimmed" : ""}`}>
        {data.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {metadata && metadata.totalPages > 0 && (
        <Pagination metadata={metadata} count={data.length} onPageChange={goToPage} />
      )}
    </section>
  );
}
