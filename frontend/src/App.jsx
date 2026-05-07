// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api }          from "./api";
import { C, btn, input } from "./styles";
import { AppProvider }  from "./contexts/AppContext";
import Dashboard    from "./pages/Dashboard";
import InventoryPage from "./pages/InventoryPage";
import ImportPage   from "./pages/ImportPage";
import ChatPage     from "./pages/ChatPage";
import OutletsPage  from "./pages/OutletsPage";

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [form, setForm]     = useState({ username: "boss", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const login = async () => {
    if (!form.password) return;
    setLoading(true); setError("");
    const data = await api.login(form.username, form.password);
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    onLogin(data.user);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ width: 360, background: "#0d1117", border: `1px solid ${C.border}`, borderRadius: 20, padding: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>StoreIO</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>Inventory Management System</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input()} placeholder="Username" value={form.username}
            onChange={set("username")} />
          <input style={input()} type="password" placeholder="Password" value={form.password}
            onChange={set("password")} onKeyDown={e => e.key === "Enter" && login()} />
          {error && <div style={{ color: C.red, fontSize: 12 }}>{error}</div>}
          <button style={{ ...btn("primary"), padding: 12, marginTop: 4, justifyContent: "center" }}
            onClick={login} disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
          <p style={{ color: "#2d4060", fontSize: 11, textAlign: "center" }}>Default: boss / boss123</p>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { to: "/",          icon: "⬛", label: "Dashboard" },
  { to: "/inventory", icon: "📦", label: "Inventory"  },
  { to: "/outlets",   icon: "🏪", label: "Outlets"    },
  { to: "/import",    icon: "📥", label: "Import"     },
  { to: "/chat",      icon: "🤖", label: "AI Chat"    },
];

function Sidebar({ user, onLogout }) {
  return (
    <div style={{
      width: 220, minHeight: "100vh",
      background: "#0d1117", borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      padding: "24px 16px", flexShrink: 0,
    }}>
      <div style={{ marginBottom: 32, paddingLeft: 8 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>StoreIO</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Inventory Platform</div>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 8,
            textDecoration: "none", fontSize: 14, transition: "all .15s",
            background: isActive ? C.accent + "22" : "transparent",
            color:      isActive ? C.accent          : C.muted,
            fontWeight: isActive ? 600               : 400,
          })}>
            <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, paddingLeft: 4 }}>
          {user.username} · {user.role}
        </div>
        <button style={{ ...btn("ghost"), width: "100%", justifyContent: "flex-start" }} onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <BrowserRouter>
      <AppProvider>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar user={user} onLogout={logout} />
          <main style={{ flex: 1, overflowY: "auto" }}>
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/outlets"   element={<OutletsPage />} />
              <Route path="/import"    element={<ImportPage />} />
              <Route path="/chat"      element={<ChatPage />} />
              <Route path="*"          element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
