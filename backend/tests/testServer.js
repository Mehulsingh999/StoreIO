// Builds a fresh Express app for tests (no listen, no chat route).
// jest.mock("../db/database") must be called BEFORE requiring this file.
const express = require("express");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth",      require("../routes/auth"));
  app.use("/api/catalog",   require("../routes/catalog"));
  app.use("/api/inventory", require("../routes/inventory"));
  app.use("/api/import",    require("../routes/import"));
  app.get("/api/health",    (_, res) => res.json({ ok: true }));
  app.use((_, res) => res.status(404).json({ error: "Not found" }));
  app.use((err, _req, res, _next) => res.status(500).json({ error: "Internal server error" }));
  return app;
};

module.exports = { buildApp };
