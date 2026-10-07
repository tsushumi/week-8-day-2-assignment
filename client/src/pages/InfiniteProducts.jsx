import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_FILTERS, fetchProducts } from "../api.js";
import Filters from "../components/Filters.jsx";
import ProductCard from "../components/ProductCard.jsx";

const LIMIT = 10;

export default function InfiniteProducts() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);
  const nextPageRef = useRef(1);
  const loadingRef = useRef(false); // synchronous guard against duplicate fetches
  const generationRef = useRef(0); // bumps on every reset so stale responses are ignored
  const controllerRef = useRef(null);

  const handleFilterChange = useCallback((partial) => {
    setFilters((f) => ({ ...f, ...partial }));
  }, []);

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const generation = generationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const { data, metadata } = await fetchProducts(
        { page: nextPageRef.current, limit: LIMIT, filters },
        controller.signal
      );
      if (generation !== generationRef.current) return;

      // Append, never replace. De-dupe by id in case rows shifted between requests.
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !seen.has(p.id))];
      });
      setTotal(metadata.total);
      setHasMore(metadata.hasNext);
      nextPageRef.current += 1; // advance only after a successful fetch
    } catch (err) {
      if (err.name === "AbortError" || generation !== generationRef.current) return;
      setError(err.message);
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [filters]);

  // Initial load and reset whenever the filters/sort change.
  useEffect(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    loadingRef.current = false;
    nextPageRef.current = 1;
    setItems([]);
    setTotal(null);
    setHasMore(true);
    setError(null);
    loadNextPage();
    return () => controllerRef.current?.abort();
  }, [loadNextPage]);

  // Watch the sentinel. Re-created after each load finishes so that if the sentinel
  // is still on screen (short list / tall monitor) it fires again straight away.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error, loadNextPage]);

  return (
    <section>
      <Filters filters={filters} onChange={handleFilterChange} />

      {total !== null && (
        <p className="status">
          Showing {items.length} of {total} products
        </p>
      )}

      <div className="grid">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Invisible sentinel: when it scrolls into view we load the next page */}
      <div ref={sentinelRef} className="sentinel" aria-hidden="true" />

      {loading && <p className="status" role="status">{items.length === 0 ? "Loading..." : "Loading more..."}</p>}

      {error && (
        <div className="error" role="alert">
          Could not load products: {error}{" "}
          <button type="button" onClick={loadNextPage}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !hasMore && items.length > 0 && (
        <p className="status end">You have reached the end.</p>
      )}
      {!loading && !error && !hasMore && items.length === 0 && (
        <p className="status">No products found.</p>
      )}
    </section>
  );
}
