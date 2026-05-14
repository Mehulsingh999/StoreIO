// backend/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { dbReady } = require("./db/database");

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl / health checks (no Origin header)
    if (!origin) return cb(null, true);
    const allowed = (process.env.FRONTEND_URL || "").split(",").map(s => s.trim()).filter(Boolean);
    // dev fallback: allow all
    if (!allowed.length || process.env.NODE_ENV !== "production") return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth",      require("./routes/auth"));
app.use("/api/catalog",   require("./routes/catalog"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/import",    require("./routes/import"));
app.use("/api/chat",      require("./routes/chat"));
app.get("/api/health",    (_, res) => res.json({ ok: true, ts: Date.now() }));

// 404 catch-all
app.use((_, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;

dbReady
  .then(() => app.listen(PORT, () => console.log(`\n🟢 StoreIO API → http://localhost:${PORT}\n`)))
  .catch(e => { console.error("❌ Database init failed:", e.message); process.exit(1); });
