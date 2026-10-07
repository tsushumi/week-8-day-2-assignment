/**
 * Up to `size` page numbers centred on the current page, clamped to the range.
 *   page 6 of 10 -> [4,5,6,7,8]   page 1 of 10 -> [1..5]   page 10 of 10 -> [6..10]
 */
export function getPageNumbers(page, totalPages, size = 5) {
  if (totalPages < 1) return [];
  const count = Math.min(size, totalPages);
  const half = Math.floor(size / 2);
  let start = page - half;
  start = Math.max(1, Math.min(start, totalPages - count + 1));
  return Array.from({ length: count }, (_, i) => start + i);
}
