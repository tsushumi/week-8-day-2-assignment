import { getPageNumbers } from "../pagination.js";

export default function Pagination({ metadata, count, onPageChange }) {
  const { page, totalPages, total, hasNext, hasPrev } = metadata;
  const pages = getPageNumbers(page, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-buttons">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={!hasPrev}>
          Previous
        </button>
        {pages.map((p) => (
          <button
            type="button"
            key={p}
            className={p === page ? "active" : ""}
            aria-current={p === page ? "page" : undefined}
            onClick={() => p !== page && onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!hasNext}>
          Next
        </button>
      </div>
      <p className="pagination-info">
        Page {page} of {totalPages}
        <span className="sep">·</span>
        Showing {count} of {total} total products
      </p>
    </nav>
  );
}
