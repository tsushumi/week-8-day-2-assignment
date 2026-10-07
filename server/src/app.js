const express = require("express");
const cors = require("cors");

const SORTABLE_FIELDS = ["createdAt", "price", "name"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse a query value that must be a whole number.
 * Returns the default when the param is absent, NaN when it is present but invalid.
 */
function parseIntParam(value, fallback) {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string" || !/^-?\d+$/.test(value.trim())) return NaN;
  return Number.parseInt(value, 10);
}

/**
 * The app is built from a factory so tests can inject a fake Prisma client.
 */
function createApp(prisma) {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
  app.use(express.json());

  // GET /api/products?page=1&limit=10&sort=price&order=asc&category=Beverages&search=tea
  app.get("/api/products", async (req, res, next) => {
    try {
      const page = parseIntParam(req.query.page, DEFAULT_PAGE);
      const limit = parseIntParam(req.query.limit, DEFAULT_LIMIT);

      if (Number.isNaN(page) || page < 1) {
        return res.status(400).json({ error: "page must be an integer of at least 1" });
      }
      if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res
          .status(400)
          .json({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` });
      }

      // Sorting (default: newest first)
      const sort = req.query.sort === undefined || req.query.sort === "" ? "createdAt" : req.query.sort;
      const order = req.query.order === undefined || req.query.order === "" ? "desc" : req.query.order;

      if (!SORTABLE_FIELDS.includes(sort)) {
        return res
          .status(400)
          .json({ error: `sort must be one of: ${SORTABLE_FIELDS.join(", ")}` });
      }
      if (order !== "asc" && order !== "desc") {
        return res.status(400).json({ error: "order must be 'asc' or 'desc'" });
      }

      // Filtering — the SAME where clause feeds findMany and count so metadata stays correct
      const where = {};
      const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      if (category) where.category = category;
      if (search) where.name = { contains: search, mode: "insensitive" };

      const skip = (page - 1) * limit;

      // The id tiebreaker guarantees a deterministic order, otherwise rows that share
      // a sort value (e.g. same price) can repeat or vanish between pages.
      const orderBy = [{ [sort]: order }];
      if (sort !== "createdAt") orderBy.push({ createdAt: "desc" });
      orderBy.push({ id: order === "asc" ? "asc" : "desc" });

      const [data, total] = await Promise.all([
        prisma.product.findMany({ where, orderBy, skip, take: limit }),
        prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        data,
        metadata: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/categories — distinct categories for the filter dropdown
  app.get("/api/categories", async (_req, res, next) => {
    try {
      const rows = await prisma.product.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });
      res.json({ data: rows.map((r) => r.category) });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
