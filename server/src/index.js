require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { createApp } = require("./app");

const prisma = new PrismaClient();
const app = createApp(prisma);
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
