import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPageNumbers } from "./pagination.js";
import PaginatedProducts from "./pages/PaginatedProducts.jsx";
import InfiniteProducts from "./pages/InfiniteProducts.jsx";

// ---- fake API (50 products) wired to global fetch ----
const ALL = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1, name: `Product ${i + 1}`, price: 100 + i, category: i % 2 ? "Snacks" : "Beverages",
  description: "desc", createdAt: new Date(2026, 0, 1, i).toISOString(),
}));
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = vi.fn(async (url) => {
    const u = new URL(url);
    calls.push(u);
    if (u.pathname === "/api/categories") return { ok: true, json: async () => ({ data: ["Beverages", "Snacks"] }) };
    const page = +(u.searchParams.get("page") || 1), limit = +(u.searchParams.get("limit") || 10);
    const cat = u.searchParams.get("category"), search = u.searchParams.get("search");
    let rows = [...ALL].reverse().filter((r) => (!cat || r.category === cat) && (!search || r.name.includes(search)));
    if (u.searchParams.get("sort") === "price" && u.searchParams.get("order") === "asc") rows.sort((a, b) => a.price - b.price);
    const totalPages = Math.ceil(rows.length / limit);
    return { ok: true, json: async () => ({ data: rows.slice((page - 1) * limit, page * limit),
      metadata: { page, limit, total: rows.length, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } }) };
  });
  window.scrollTo = vi.fn();
});

const renderAt = (el) => render(<MemoryRouter>{el}</MemoryRouter>);

describe("pagination page", () => {
  it("renders page 1 controls, text, and navigates", async () => {
    const user = userEvent.setup();
    renderAt(<PaginatedProducts />);
    expect(screen.getByText(/Loading products/)).toBeTruthy();
    await screen.findByText("Product 50");
    expect(screen.getByText(/Page 1 of 5/)).toBeTruthy();
    expect(screen.getByText(/Showing 10 of 50 total products/)).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByText("Previous").disabled).toBe(true);
    expect(within(nav).getByText("1").className).toContain("active");
    await user.click(within(nav).getByText("Next"));
    await screen.findByText("Product 40");
    expect(screen.getByText(/Page 2 of 5/)).toBeTruthy();
    await user.click(within(nav).getByText("5"));
    await screen.findByText("Product 10");
    expect(within(nav).getByText("Next").disabled).toBe(true);
  });

  it("filter/sort/search reset to page 1 and send params", async () => {
    const user = userEvent.setup();
    renderAt(<PaginatedProducts />);
    await screen.findByText("Product 50");
    await user.click(within(screen.getByRole("navigation", { name: "Pagination" })).getByText("3"));
    await screen.findByText(/Page 3 of 5/);
    await user.selectOptions(screen.getByLabelText("Sort products"), "price-asc");
    await screen.findByText(/Page 1 of 5/);
    let last = calls.at(-1);
    expect(last.searchParams.get("page")).toBe("1");
    expect(last.searchParams.get("sort")).toBe("price");
    expect(last.searchParams.get("order")).toBe("asc");
    await screen.findByText("Product 1");
    await user.selectOptions(screen.getByLabelText("Filter by category"), "Snacks");
    await screen.findByText(/Page 1 of 3/);
    expect(calls.at(-1).searchParams.get("category")).toBe("Snacks");
    await user.type(screen.getByLabelText("Search products"), "Product 2");
    await waitFor(() => expect(calls.at(-1).searchParams.get("search")).toBe("Product 2"), { timeout: 2000 });
    expect(calls.at(-1).searchParams.get("page")).toBe("1");
  });

  it("shows an error state", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: "boom" }) }));
    renderAt(<PaginatedProducts />);
    await screen.findByText(/Could not load products: boom/);
  });
});

describe("infinite scroll page", () => {
  let observers;
  beforeEach(() => {
    observers = [];
    globalThis.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; this.disconnected = false; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; } unobserve() {}
      trigger() { this.cb([{ isIntersecting: true }]); }
    };
  });
  const live = () => observers.filter((o) => !o.disconnected).at(-1);
  const productCalls = () => calls.filter((c) => c.pathname === "/api/products");

  it("loads page 1, appends on intersect, ignores duplicate triggers, and ends", async () => {
    renderAt(<InfiniteProducts />);
    await screen.findByText("Product 50");
    expect(productCalls()).toHaveLength(1);
    expect(screen.queryByText("You have reached the end.")).toBeNull();

    for (let page = 2; page <= 5; page++) {
      await waitFor(() => expect(live()).toBeTruthy());
      // fire twice synchronously: second must be ignored (duplicate guard)
      await act(async () => { live().trigger(); live().trigger(); });
      await waitFor(() => expect(productCalls()).toHaveLength(page));
      await screen.findByText(`Product ${50 - (page - 1) * 10}`);
    }
    expect(screen.getAllByRole("article")).toHaveLength(50); // appended, not replaced
    expect(new Set(productCalls().map((c) => c.searchParams.get("page")))).toEqual(new Set(["1", "2", "3", "4", "5"]));
    await screen.findByText("You have reached the end.");
    expect(live()).toBeUndefined();
  });

  it("filter change resets the list and starts from page 1", async () => {
    const user = userEvent.setup();
    renderAt(<InfiniteProducts />);
    await screen.findByText("Product 50");
    await waitFor(() => expect(live()).toBeTruthy());
    await act(async () => live().trigger());
    await screen.findByText("Product 40");
    await user.selectOptions(screen.getByLabelText("Filter by category"), "Snacks");
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(10));
    expect(calls.at(-1).searchParams.get("page")).toBe("1");
    expect(screen.getAllByRole("article").every((a) => a.textContent.includes("Snacks"))).toBe(true);
  });
});

describe("getPageNumbers", () => {
  it("matches the assignment examples", () => {
    expect(getPageNumbers(6, 10)).toEqual([4, 5, 6, 7, 8]);
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(10, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(getPageNumbers(1, 0)).toEqual([]);
  });
});
