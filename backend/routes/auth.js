// backend/routes/auth.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { get } = require("../db/database");

const SECRET = process.env.JWT_SECRET || "storeio-secret";

router.post("/login", async (req, res) => {
  console.log("LOGIN request from origin:", req.headers.origin);
  console.log("FRONTEND_URL env:", process.env.FRONTEND_URL);
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const user = await get("SELECT * FROM users WHERE username=?", [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: "Invalid credentials" });

    const payload = { id: user.id, username: user.username, role: user.role, outlet_id: user.outlet_id };
    const token   = jwt.sign(payload, SECRET, { expiresIn: "24h" });
    res.json({ token, user: payload });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
