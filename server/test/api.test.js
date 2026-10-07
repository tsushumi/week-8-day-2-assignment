const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

// ---- Minimal in-memory stand-in for the Prisma Product delegate ----
function makeFakePrisma() {
  const cats = ["Beverages", "Groceries", "Snacks", "Household", "Electronics"];
  const rows = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? "Ketepa Tea" : i === 1 ? "Green TEA Box" : `Item ${i + 1}`,
    price: 100 + (i % 5) * 50, // lots of price ties on purpose
    category: cats[i % cats.length],
    description: "d",
    createdAt: new Date(2026, 0, 1, i),
  }));
  const matches = (r, where = {}) =>
    (!where.category || r.category === where.category) &&
    (!where.name || r.name.toLowerCase().includes(where.name.contains.toLowerCase()));
  const cmp = (orderBy) => (a, b) => {
    for (const o of orderBy) {
      const [k, dir] = Object.entries(o)[0];
      if (a[k] < b[k]) return dir === "asc" ? -1 : 1;
      if (a[k] > b[k]) return dir === "asc" ? 1 : -1;
    }
    return 0;
  };
  return {
    product: {
      async findMany({ where, orderBy, skip = 0, take, select, distinct } = {}) {
        let out = rows.filter((r) => matches(r, where));
        if (orderBy) out = out.sort(cmp(Array.isArray(orderBy) ? orderBy : [orderBy]));
        if (distinct) out = out.filter((r, i, a) => a.findIndex((x) => x.category === r.category) === i);
        if (take !== undefined) out = out.slice(skip, skip + take);
        return select ? out.map((r) => ({ category: r.category })) : out;
      },
      async count({ where } = {}) {
        return rows.filter((r) => matches(r, where)).length;
      },
    },
  };
}

async function withServer(fn) {
  const server = createApp(makeFakePrisma()).listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    await fn(async (path) => {
      const res = await fetch(base + path);
      return { status: res.status, body: await res.json() };
    });
  } finally {
    server.close();
  }
}

test("defaults: page 1, limit 10, newest first", () =>
  withServer(async (get) => {
    const { status, body } = await get("/api/products");
    assert.equal(status, 200);
    assert.equal(body.data.length, 10);
    assert.deepEqual(body.metadata, { page: 1, limit: 10, total: 50, totalPages: 5, hasNext: true, hasPrev: false });
    assert.equal(body.data[0].id, 50);
  }));

test("page=2&limit=5", () =>
  withServer(async (get) => {
    const { body } = await get("/api/products?page=2&limit=5");
    assert.equal(body.data.length, 5);
    assert.deepEqual(body.metadata, { page: 2, limit: 5, total: 50, totalPages: 10, hasNext: true, hasPrev: true });
  }));

test("page beyond totalPages returns empty data with correct metadata", () =>
  withServer(async (get) => {
    const { status, body } = await get("/api/products?page=100&limit=10");
    assert.equal(status, 200);
    assert.deepEqual(body.data, []);
    assert.deepEqual(body.metadata, { page: 100, limit: 10, total: 50, totalPages: 5, hasNext: false, hasPrev: true });
  }));

test("validation errors", () =>
  withServer(async (get) => {
    for (const q of ["page=0", "page=-1", "page=abc", "page=1.5", "limit=0", "limit=101", "limit=x", "sort=password", "order=sideways"]) {
      const { status } = await get(`/api/products?${q}`);
      assert.equal(status, 400, q);
    }
  }));

test("sort by price asc has no duplicates or gaps across pages despite ties", () =>
  withServer(async (get) => {
    const seen = [];
    for (let p = 1; p <= 5; p++) {
      const { body } = await get(`/api/products?page=${p}&limit=10&sort=price&order=asc`);
      seen.push(...body.data);
    }
    assert.equal(new Set(seen.map((r) => r.id)).size, 50);
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i - 1].price <= seen[i].price);
  }));

test("oldest first and name A-Z", () =>
  withServer(async (get) => {
    let r = await get("/api/products?sort=createdAt&order=asc");
    assert.equal(r.body.data[0].id, 1);
    r = await get("/api/products?sort=name&order=asc&limit=100");
    const names = r.body.data.map((x) => x.name);
    assert.deepEqual(names, [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  }));

test("category filter applies to data AND count", () =>
  withServer(async (get) => {
    const { body } = await get("/api/products?category=Beverages&limit=4");
    assert.equal(body.metadata.total, 10);
    assert.equal(body.metadata.totalPages, 3);
    assert.ok(body.data.every((r) => r.category === "Beverages"));
  }));

test("search is case-insensitive, combines with filters, and can be empty", () =>
  withServer(async (get) => {
    let r = await get("/api/products?search=tea");
    assert.equal(r.body.metadata.total, 2);
    r = await get("/api/products?search=tea&category=Beverages");
    assert.equal(r.body.metadata.total, 1);
    r = await get("/api/products?search=zzzz");
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.metadata.totalPages, 0);
    assert.equal(r.body.metadata.hasNext, false);
    assert.equal(r.body.metadata.hasPrev, false);
  }));

test("categories endpoint returns distinct sorted categories", () =>
  withServer(async (get) => {
    const { body } = await get("/api/categories");
    assert.deepEqual(body.data, ["Beverages", "Electronics", "Groceries", "Household", "Snacks"]);
  }));
