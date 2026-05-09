// Design tokens
export const C = {
  bg:            "#080b0f",
  surface:       "#0d1117",
  card:          "#0f1520",
  cardHover:     "#141d2e",
  border:        "#1e2d3d",
  borderLight:   "#243448",
  accent:        "#3b82f6",
  accentDim:     "#1d4ed8",
  green:         "#10b981",
  red:           "#ef4444",
  yellow:        "#f59e0b",
  purple:        "#8b5cf6",
  cyan:          "#06b6d4",
  text:          "#e2e8f0",
  textSoft:      "#cbd5e1",
  muted:         "#64748b",
  // Semantic
  shadow:        "0 4px 24px rgba(0,0,0,.45)",
  shadowLg:      "0 8px 40px rgba(0,0,0,.65)",
  shadowSm:      "0 2px 8px rgba(0,0,0,.3)",
  accentGlow:    "0 0 20px rgba(59,130,246,.25)",
  gradient:      "linear-gradient(135deg,#3b82f6,#6366f1)",
  gradientSoft:  "linear-gradient(135deg,rgba(59,130,246,.15),rgba(99,102,241,.1))",
  gradientGreen: "linear-gradient(135deg,#10b981,#06b6d4)",
  glass:         "rgba(13,17,23,0.82)",
};

// ── Global CSS injection ───────────────────────────────────────────────────────
// Called once in App.jsx — injects hover states, focus rings, and keyframes
export const injectGlobalStyles = () => {
  if (typeof document === "undefined" || document.getElementById("storeio-theme")) return;
  const s = document.createElement("style");
  s.id = "storeio-theme";
  s.textContent = `
    @keyframes slideUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
    @keyframes spin      { to   { transform:rotate(360deg) } }
    @keyframes pulse     { 0%,100%{opacity:.3} 50%{opacity:1} }
    @keyframes bounceDot { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
    @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes popIn     { 0%{opacity:0;transform:scale(.92)} 100%{opacity:1;transform:scale(1)} }

    .si-page  { animation: fadeIn .22s ease }
    .si-slide { animation: slideUp .22s ease }
    .si-pop   { animation: popIn .18s ease }

    .si-btn-primary { transition: all .15s ease !important; }
    .si-btn-primary:hover:not(:disabled) {
      filter: brightness(1.14);
      box-shadow: 0 0 22px rgba(59,130,246,.4), 0 4px 12px rgba(0,0,0,.3) !important;
      transform: translateY(-1px);
    }
    .si-btn-primary:active:not(:disabled) { transform: translateY(0); }

    .si-btn-ghost { transition: all .15s ease !important; }
    .si-btn-ghost:hover:not(:disabled) {
      background: rgba(255,255,255,.07) !important;
      color: #e2e8f0 !important;
      border-color: rgba(255,255,255,.14) !important;
    }

    .si-btn-danger { transition: all .15s ease !important; }
    .si-btn-danger:hover:not(:disabled) {
      background: rgba(239,68,68,.15) !important;
      border-color: rgba(239,68,68,.45) !important;
      color: #ef4444 !important;
    }

    .si-btn-success { transition: all .15s ease !important; }
    .si-btn-success:hover:not(:disabled) { filter: brightness(1.1); }

    .si-btn-purple { transition: all .15s ease !important; }
    .si-btn-purple:hover:not(:disabled) { filter: brightness(1.1); }

    .si-input { transition: border-color .15s, box-shadow .15s !important; }
    .si-input:focus {
      border-color: rgba(59,130,246,.55) !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,.12) !important;
      outline: none !important;
    }

    .si-select { transition: border-color .15s, box-shadow .15s !important; }
    .si-select:focus {
      border-color: rgba(59,130,246,.55) !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,.12) !important;
      outline: none !important;
    }

    .si-nav-link { transition: all .15s ease !important; position: relative; }
    .si-nav-link:hover:not(.si-nav-active) {
      background: rgba(255,255,255,.05) !important;
      color: #e2e8f0 !important;
    }

    .si-table-row { transition: background .1s ease !important; cursor: default; }
    .si-table-row:hover td { background: rgba(59,130,246,.05) !important; }
    .si-table-row:hover .si-row-actions { opacity: 1 !important; }
    .si-row-actions { opacity: 0; transition: opacity .15s ease !important; }

    .si-tab { transition: all .16s ease !important; }
    .si-tab:hover:not(.si-tab-active) {
      background: rgba(255,255,255,.06) !important;
      color: #e2e8f0 !important;
    }

    .si-chip { transition: all .15s ease !important; }
    .si-chip:hover {
      background: rgba(59,130,246,.12) !important;
      border-color: rgba(59,130,246,.35) !important;
      color: #93c5fd !important;
      transform: translateY(-1px);
    }

    .si-card-hover { transition: all .2s ease !important; }
    .si-card-hover:hover {
      border-color: rgba(59,130,246,.28) !important;
      transform: translateY(-2px);
      box-shadow: 0 10px 36px rgba(0,0,0,.45) !important;
    }

    .si-outlet-card { transition: all .2s ease !important; cursor: default; }
    .si-outlet-card:hover {
      border-color: rgba(59,130,246,.3) !important;
      box-shadow: 0 8px 28px rgba(0,0,0,.4) !important;
      transform: translateY(-2px);
    }
    .si-outlet-card:hover .si-outlet-del { opacity: 1 !important; }
    .si-outlet-del { opacity: 0; transition: opacity .15s ease !important; }

    .si-shimmer {
      background: linear-gradient(90deg,#111827 25%,#1a2540 50%,#111827 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite linear;
      border-radius: 6px;
    }

    .si-msg-ai { position: relative; }
    .si-msg-user { position: relative; }

    .si-drop-zone { transition: all .2s ease !important; }
    .si-drop-zone:hover { border-color: rgba(59,130,246,.5) !important; background: rgba(59,130,246,.04) !important; }

    /* ── Typography ── */
    .si-gradient-title {
      background: linear-gradient(130deg,#f8fafc 0%,#94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-family: 'Space Grotesk', sans-serif !important;
    }
    .si-section-title { font-family: 'Space Grotesk', sans-serif !important; font-weight: 600 !important; }

    /* ── Stat number gradients ── */
    .si-num-blue   { background:linear-gradient(135deg,#60a5fa,#818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .si-num-green  { background:linear-gradient(135deg,#34d399,#22d3ee); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .si-num-purple { background:linear-gradient(135deg,#a78bfa,#c084fc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .si-num-red    { background:linear-gradient(135deg,#f87171,#fb923c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .si-num-yellow { background:linear-gradient(135deg,#fbbf24,#f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

    /* ── Enhanced hovers ── */
    .si-btn-primary:hover:not(:disabled) {
      filter: brightness(1.16);
      box-shadow: 0 0 28px rgba(59,130,246,.45), 0 4px 16px rgba(0,0,0,.35) !important;
      transform: translateY(-1px);
    }
    .si-card-hover:hover {
      border-color: rgba(59,130,246,.3) !important;
      transform: translateY(-2px);
      box-shadow: 0 14px 44px rgba(0,0,0,.55), 0 0 0 1px rgba(59,130,246,.1) !important;
    }
  `;
  document.head.appendChild(s);
};

// ── Component style factories ─────────────────────────────────────────────────

export const btn = (variant = "primary", extra = {}) => ({
  padding: "9px 18px", borderRadius: 8, border: "none",
  cursor: "pointer", fontSize: 13, fontWeight: 500,
  fontFamily: "'Space Grotesk',sans-serif", letterSpacing: .1,
  display: "inline-flex", alignItems: "center", gap: 6,
  ...(variant === "primary" ? {
    background: "linear-gradient(135deg,#3b82f6,#6366f1)",
    color: "#fff",
    boxShadow: "0 2px 10px rgba(59,130,246,.3)",
  } : {}),
  ...(variant === "ghost" ? {
    background: "transparent", color: C.muted,
    border: `1px solid ${C.border}`,
  } : {}),
  ...(variant === "danger" ? {
    background: "transparent", color: C.red,
    border: `1px solid ${C.red}33`,
  } : {}),
  ...(variant === "success" ? {
    background: C.green + "20", color: C.green,
    border: `1px solid ${C.green}44`,
  } : {}),
  ...(variant === "purple" ? {
    background: C.purple + "20", color: C.purple,
    border: `1px solid ${C.purple}44`,
  } : {}),
  ...extra,
});

export const input = (extra = {}) => ({
  padding: "9px 14px", borderRadius: 8,
  background: C.surface, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13, outline: "none", width: "100%",
  fontFamily: "'Space Grotesk',sans-serif",
  ...extra,
});

export const card = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 14, padding: 20,
  boxShadow: "0 2px 16px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.03)",
  ...extra,
});

export const badge = (color = C.muted, extra = {}) => ({
  display: "inline-flex", alignItems: "center",
  padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
  background: color + "22", color, border: `1px solid ${color}44`,
  ...extra,
});
