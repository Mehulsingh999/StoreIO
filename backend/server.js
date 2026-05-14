// backend/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { dbReady } = require("./db/database");

const app = express();

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== "production") return cb(null, true);
    const allowed = (process.env.FRONTEND_URL || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0) return cb(null, true);
    if (allowed.some(o => o === origin)) return cb(null, true);
    console.log("CORS rejected origin:", origin, "| allowed:", allowed);
    return cb(null, true); // temporarily allow all to unblock, then tighten
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

// Health check — no auth needed
app.get("/api/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth",      require("./routes/auth"));
app.use("/api/catalog",   require("./routes/catalog"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/import",    require("./routes/import"));
app.use("/api/chat",      require("./routes/chat"));

// 404 catch-all
app.use((_, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;

dbReady
  .then(() => {
    console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "(not set)");
    console.log("NODE_ENV:", process.env.NODE_ENV || "(not set)");
    console.log("ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY ? "set" : "NOT SET");
    app.listen(PORT, () => console.log(`\n🟢 StoreIO API → http://localhost:${PORT}\n`));
  })
  .catch(e => {
    console.error("❌ Database init failed:", e.message);
    process.exit(1);
  });
