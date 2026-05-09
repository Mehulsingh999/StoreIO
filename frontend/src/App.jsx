// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api } from "./api";
import { C, btn, input, injectGlobalStyles } from "./styles";
import { AppProvider } from "./contexts/AppContext";
import {
  LayoutDashboard, Package, Store, Upload, Bot, LogOut, Eye, EyeOff, Menu, X,
} from "./icons";
import Dashboard    from "./pages/Dashboard";
import InventoryPage from "./pages/InventoryPage";
import ImportPage   from "./pages/ImportPage";
import ChatPage     from "./pages/ChatPage";
import OutletsPage  from "./pages/OutletsPage";

injectGlobalStyles();

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [form, setForm]       = useState({ username: "boss", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

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
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow orbs */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", top:-200, right:-200,
        background:"radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 68%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:550, height:550, borderRadius:"50%", bottom:-220, left:-180,
        background:"radial-gradient(circle,rgba(139,92,246,.09) 0%,transparent 68%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", top:"45%", left:"62%",
        background:"radial-gradient(circle,rgba(6,182,212,.07) 0%,transparent 68%)", pointerEvents:"none" }} />

      {/* Glass card */}
      <div className="si-login-card" style={{
        width: 420, position: "relative", zIndex: 1,
        background: "rgba(13,17,23,0.85)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(59,130,246,.18)",
        borderRadius: 22,
        padding: "42px 38px",
        boxShadow: "0 8px 40px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.05)",
        animation: "slideUp .32s ease",
      }}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:34 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(59,130,246,.4)",
          }}>
            <Package size={24} stroke="#fff" />
          </div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, marginBottom: 6,
            letterSpacing: -1,
            background: "linear-gradient(135deg,#f1f5f9 0%,#93c5fd 50%,#a5b4fc 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>StoreIO</h1>
          <p style={{ color: C.muted, fontSize: 13, letterSpacing: .2 }}>Inventory Management Platform</p>
        </div>

        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:C.muted, letterSpacing:.8, marginBottom:6, textTransform:"uppercase" }}>
              Username
            </label>
            <input
              className="si-input"
              style={{ ...input(), letterSpacing: .3 }}
              placeholder="Enter username"
              value={form.username}
              onChange={set("username")}
              onKeyDown={e => e.key === "Enter" && login()}
            />
          </div>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:C.muted, letterSpacing:.8, marginBottom:6, textTransform:"uppercase" }}>
              Password
            </label>
            <div style={{ position:"relative" }}>
              <input
                className="si-input"
                style={{ ...input(), paddingRight: 42, letterSpacing: .3 }}
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={form.password}
                onChange={set("password")}
                onKeyDown={e => e.key === "Enter" && login()}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                style={{
                  position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color:C.muted, cursor:"pointer",
                  padding:2, display:"flex", alignItems:"center", transition:"color .15s",
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:8, padding:"10px 14px", fontSize:13, color:C.red,
            }}>
              <span style={{ fontSize:15 }}>⚠</span> {error}
            </div>
          )}

          <button
            className="si-btn-primary"
            style={{
              ...btn("primary"),
              padding: "13px 20px", marginTop: 4, justifyContent: "center",
              fontSize: 14, fontWeight: 600, borderRadius: 10,
              background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            }}
            onClick={login}
            disabled={loading}
          >
            {loading
              ? <><div style={{ width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite" }} /> Signing in…</>
              : "Sign in"
            }
          </button>

          <p style={{ color:"rgba(100,116,139,.5)", fontSize:11, textAlign:"center", paddingTop:4 }}>
            Default credentials: <span style={{ color:C.muted }}>boss / boss123</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { to: "/",          Icon: LayoutDashboard, label: "Dashboard" },
  { to: "/inventory", Icon: Package,          label: "Inventory"  },
  { to: "/outlets",   Icon: Store,            label: "Outlets"    },
  { to: "/import",    Icon: Upload,           label: "Import"     },
  { to: "/chat",      Icon: Bot,              label: "AI Chat"    },
];

function Sidebar({ user, onLogout, isOpen, onClose }) {
  const initial = user.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className={`si-sidebar${isOpen ? " si-sidebar-open" : ""}`} style={{
      width: 240, minHeight: "100vh",
      background: "linear-gradient(180deg,#0c1018 0%,#080c12 60%,#060910 100%)",
      borderRight: "1px solid rgba(30,45,61,.8)",
      display: "flex", flexDirection: "column",
      padding: "22px 14px", flexShrink: 0,
      boxShadow: "2px 0 20px rgba(0,0,0,.3)",
      position: "relative",
    }}>
      {/* Mobile close button */}
      <button
        className="si-hamburger"
        onClick={onClose}
        style={{
          position: "absolute", top: 14, right: 14,
          background: "none", border: "none",
          color: C.muted, cursor: "pointer",
          padding: 4,
        }}
      >
        <X size={18} />
      </button>

      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32, paddingLeft:6 }}>
        <div style={{
          width:32, height:32, borderRadius:9,
          background:"linear-gradient(135deg,#3b82f6,#6366f1)",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 10px rgba(59,130,246,.35)", flexShrink:0,
        }}>
          <Package size={16} stroke="#fff" />
        </div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, letterSpacing:-.4,
            background:"linear-gradient(135deg,#f1f5f9,#93c5fd)", WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            StoreIO
          </div>
          <div style={{ color:C.muted, fontSize:10, fontWeight:600, letterSpacing:.8, fontFamily:"'Space Grotesk',sans-serif" }}>INVENTORY PLATFORM</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
        {NAV.map(n => (
          <NavLink
            key={n.to} to={n.to} end={n.to === "/"}
            className={({ isActive }) => `si-nav-link${isActive ? " si-nav-active" : ""}`}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 9,
              textDecoration: "none", fontSize: 13, fontWeight: isActive ? 600 : 400,
              fontFamily: "'Space Grotesk',sans-serif", letterSpacing: .1,
              color: isActive ? "#f1f5f9" : C.muted,
              background: isActive ? "rgba(59,130,246,.12)" : "transparent",
              boxShadow: isActive ? "inset 3px 0 0 #3b82f6, 4px 0 18px rgba(59,130,246,.07)" : "inset 3px 0 0 transparent",
            })}
          >
            {({ isActive }) => (
              <>
                <n.Icon size={16} stroke={isActive ? C.accent : "currentColor"} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 6px" }}>
          <div style={{
            width:32, height:32, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:700, fontSize:13,
          }}>{initial}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"'Space Grotesk',sans-serif" }}>
              {user.username}
            </div>
            <div style={{ fontSize:11, color:C.muted, textTransform:"capitalize", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:.2 }}>{user.role}</div>
          </div>
        </div>
        <button
          className="si-btn-ghost"
          style={{ ...btn("ghost"), width:"100%", justifyContent:"flex-start", fontSize:13, gap:8, padding:"8px 10px" }}
          onClick={onLogout}
        >
          <LogOut size={14} /> Sign out
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <BrowserRouter>
      <AppProvider>
        <div style={{ display:"flex", minHeight:"100vh" }}>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="si-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          )}

          <Sidebar user={user} onLogout={logout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main style={{
            flex:1, overflowY:"auto", overflowX:"hidden",
            backgroundImage: "radial-gradient(rgba(255,255,255,.022) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}>
            {/* Mobile topbar */}
            <div className="si-topbar">
              <button
                className="si-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{ background:"none", border:"none", color:C.text, cursor:"pointer", padding:4 }}
              >
                <Menu size={22} />
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  width:26, height:26, borderRadius:7,
                  background:"linear-gradient(135deg,#3b82f6,#6366f1)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 2px 8px rgba(59,130,246,.35)", flexShrink:0,
                }}>
                  <Package size={13} stroke="#fff" />
                </div>
                <span style={{
                  fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, letterSpacing:-.3,
                  background:"linear-gradient(135deg,#f1f5f9,#93c5fd)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                }}>StoreIO</span>
              </div>
            </div>

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
