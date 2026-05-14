// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { C, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { StatCard, Empty, Skeleton } from "../components/UI";
import { Package, Store, BarChart3, AlertTriangle, Activity, Layers, CheckCircle } from "../icons";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function Dashboard() {
  const { outlets }                   = useApp();
  const [alerts, setAlerts]           = useState([]);
  const [log, setLog]                 = useState([]);
  const [inv, setInv]                 = useState([]);
  const [loading, setLoading]         = useState(true);
  const [alertOutlet, setAlertOutlet] = useState(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  useEffect(() => {
    Promise.all([
      api.getAlerts().then(d => Array.isArray(d) && setAlerts(d)),
      api.getLog().then(d => Array.isArray(d) && setLog(d)),
      api.getInventory().then(d => Array.isArray(d) && setInv(d)),
    ]).finally(() => setLoading(false));
  }, []);

  const totalStock = inv.reduce((s, i) => s + i.quantity, 0);
  const avgUnits   = inv.length ? Math.round(totalStock / inv.length) : 0;
  const today      = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Stock health buckets
  const thr           = (i) => i.low_stock_threshold || 5;
  const criticalCount = inv.filter(i => i.quantity <= thr(i)).length;
  const warningCount  = inv.filter(i => i.quantity > thr(i) && i.quantity < thr(i) * 2).length;
  const healthyCount  = inv.filter(i => i.quantity >= thr(i) * 2).length;

  // Top 5 products by quantity
  const topProducts = [...inv].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const maxQty      = topProducts[0]?.quantity || 1;

  // Outlet tab filter for low stock
  const alertOutlets    = [...new Set(alerts.map(a => a.outlet_name))].filter(Boolean);
  const filteredAlerts  = alertOutlet ? alerts.filter(a => a.outlet_name === alertOutlet) : alerts;

  return (
    <div className="si-page" style={{ padding: "32px 36px", maxWidth: 1280 }}>
      {/* Welcome banner */}
      <div className="si-welcome-banner" style={{
        background: "linear-gradient(135deg,rgba(59,130,246,.08),rgba(99,102,241,.06))",
        border: `1px solid rgba(59,130,246,.14)`,
        borderRadius: 16, padding: "22px 26px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div className="si-gradient-title" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: -.3 }}>
            {greeting()}, {user?.username ?? "there"} 👋
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {outlets.length} outlet{outlets.length !== 1 ? "s" : ""} · {today}
          </div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg,#3b82f6,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(59,130,246,.35)", flexShrink: 0,
        }}>
          <BarChart3 size={22} stroke="#fff" />
        </div>
      </div>

      {/* Stat cards — 6 cards */}
      <div className="si-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {loading ? (
          [0,1,2,3,4,5].map(i => (
            <div key={i} style={{ ...card(), minHeight: 100 }}>
              <Skeleton height={10} width="60%" style={{ marginBottom: 14 }} />
              <Skeleton height={30} width="50%" />
            </div>
          ))
        ) : (
          <>
            {/* Outlets — clickable link card */}
            <Link to="/outlets" className="si-card-hover" style={{
              ...card(), flex: 1, minWidth: 150, position: "relative", overflow: "hidden",
              paddingLeft: 20, textDecoration: "none",
            }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: C.accent, borderRadius: "14px 0 0 14px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>
                    Outlets
                  </div>
                  <div className="si-num-blue" style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1, letterSpacing: -.5 }}>
                    {outlets.length}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accent + "18", border: `1px solid ${C.accent}28`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Store size={18} stroke={C.accent} />
                  </div>
                  <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>→</span>
                </div>
              </div>
            </Link>

            <StatCard label="Products tracked" value={inv.length}    color={C.purple}  icon={Package}      />
            <StatCard label="Total units"      value={totalStock}    color={C.green}   icon={Layers}       />
            <StatCard label="Avg units/item"   value={avgUnits}      color={C.cyan}    icon={BarChart3}    />
            <StatCard label="Healthy stock"    value={healthyCount}  color={C.green}   icon={CheckCircle}  />
            <StatCard label="Low stock alerts" value={alerts.length} color={alerts.length > 0 ? C.red : C.muted} icon={AlertTriangle} />
          </>
        )}
      </div>

      {/* Main content: Low Stock + Recent Activity */}
      <div className="si-content-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

        {/* Low stock */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: alerts.length > 1 && alertOutlets.length > 1 ? 10 : 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.red + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={14} stroke={C.red} />
            </div>
            <span className="si-section-title" style={{ fontSize: 14 }}>Low Stock</span>
            {alerts.length > 0 && (
              <span style={{ marginLeft: "auto", background: C.red + "20", color: C.red, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: `1px solid ${C.red}33` }}>
                {alerts.length}
              </span>
            )}
          </div>

          {/* Outlet filter tabs */}
          {!loading && alerts.length > 1 && alertOutlets.length > 1 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
              <button className="si-chip" onClick={() => setAlertOutlet(null)} style={{
                padding: "3px 10px", fontSize: 11, cursor: "pointer", borderRadius: 20,
                background: !alertOutlet ? C.accent + "22" : C.surface,
                border: `1px solid ${!alertOutlet ? C.accent + "55" : C.border}`,
                color: !alertOutlet ? C.accent : C.muted,
              }}>All</button>
              {alertOutlets.map(o => (
                <button key={o} className="si-chip" onClick={() => setAlertOutlet(o === alertOutlet ? null : o)} style={{
                  padding: "3px 10px", fontSize: 11, cursor: "pointer", borderRadius: 20,
                  background: alertOutlet === o ? C.accent + "22" : C.surface,
                  border: `1px solid ${alertOutlet === o ? C.accent + "55" : C.border}`,
                  color: alertOutlet === o ? C.accent : C.muted,
                }}>{o}</button>
              ))}
            </div>
          )}

          {loading
            ? [0,1,2,3].map(i => (
                <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}22`, display: "flex", justifyContent: "space-between" }}>
                  <Skeleton width="55%" height={13} />
                  <Skeleton width="18%" height={13} />
                </div>
              ))
            : filteredAlerts.length === 0
              ? <Empty icon={<AlertTriangle size={20} stroke={C.muted} />} message="All stock levels healthy" />
              : filteredAlerts.slice(0, 10).map((a, i) => {
                  const pct = Math.min(100, (a.quantity / (a.low_stock_threshold || 5)) * 100);
                  return (
                    <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{a.product_name}</span>
                          <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{a.outlet_name}</span>
                        </div>
                        <span style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>{a.quantity} left</span>
                      </div>
                      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct < 30 ? C.red : C.yellow, borderRadius: 2, transition: "width .4s ease" }} />
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Recent activity */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={14} stroke={C.accent} />
            </div>
            <span className="si-section-title" style={{ fontSize: 14 }}>Recent Activity</span>
          </div>

          {loading
            ? [0,1,2,3].map(i => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
                  <Skeleton width={28} height={28} style={{ borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="70%" height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width="40%" height={10} />
                  </div>
                </div>
              ))
            : log.length === 0
              ? <Empty icon={<Activity size={20} stroke={C.muted} />} message="No activity recorded yet" />
              : log.slice(0, 10).map((r, i) => {
                  const isPos    = r.qty_added >= 0;
                  const initials = r.by_user?.[0]?.toUpperCase() ?? "?";
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: isPos ? C.green + "22" : C.red + "22",
                        border: `1px solid ${(isPos ? C.green : C.red) + "44"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: isPos ? C.green : C.red,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product}</span>
                          <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 8 }}>{timeAgo(r.created_at)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isPos ? C.green : C.red }}>
                            {isPos ? "+" : ""}{r.qty_added} units
                          </span>
                          <span style={{ fontSize: 11, color: C.muted }}>· {r.outlet} · {r.by_user}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </div>

      {/* Analytics: Top Products + Stock Health */}
      <div className="si-content-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

        {/* Top Products by Stock */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.cyan + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={14} stroke={C.cyan} />
            </div>
            <span className="si-section-title" style={{ fontSize: 14 }}>Top Products by Stock</span>
          </div>

          {loading
            ? [0,1,2,3,4].map(i => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <Skeleton width="60%" height={11} style={{ marginBottom: 6 }} />
                  <Skeleton width="100%" height={6} style={{ borderRadius: 3 }} />
                </div>
              ))
            : topProducts.length === 0
              ? <Empty icon={<Package size={20} stroke={C.muted} />} message="No inventory data yet" />
              : topProducts.map((p, i) => {
                  const pct   = Math.min(100, (p.quantity / maxQty) * 100);
                  const t     = p.low_stock_threshold || 5;
                  const color = p.quantity >= t * 2 ? C.green : p.quantity > t ? C.yellow : C.red;
                  return (
                    <div key={i} style={{ marginBottom: i < topProducts.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.textSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%" }}>
                          {p.product_name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{p.quantity}</span>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .5s ease" }} />
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Stock Health Breakdown */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.green + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={14} stroke={C.green} />
            </div>
            <span className="si-section-title" style={{ fontSize: 14 }}>Stock Health</span>
          </div>

          {loading
            ? [0,1,2].map(i => <Skeleton key={i} height={52} style={{ borderRadius: 10, marginBottom: 8 }} />)
            : inv.length === 0
              ? <Empty icon={<Package size={20} stroke={C.muted} />} message="No inventory data yet" />
              : (() => {
                  const total   = inv.length;
                  const buckets = [
                    { label: "Healthy",  count: healthyCount,  color: C.green,  pct: Math.round(healthyCount / total * 100)  },
                    { label: "Warning",  count: warningCount,  color: C.yellow, pct: Math.round(warningCount / total * 100)  },
                    { label: "Critical", count: criticalCount, color: C.red,    pct: Math.round(criticalCount / total * 100) },
                  ];
                  return (
                    <>
                      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 18, gap: 2 }}>
                        {buckets.map(b => b.count > 0 && (
                          <div key={b.label} style={{ width: `${b.pct}%`, minWidth: 4, background: b.color, transition: "width .5s ease" }} />
                        ))}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {buckets.map(b => (
                          <div key={b.label} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", background: b.color + "0d",
                            borderRadius: 10, border: `1px solid ${b.color}22`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: C.textSoft }}>{b.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 20, fontWeight: 700, color: b.color, fontFamily: "'Space Grotesk',sans-serif" }}>{b.count}</span>
                              <span style={{ fontSize: 11, color: C.muted, minWidth: 36, textAlign: "right" }}>{b.pct}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
          }
        </div>
      </div>
    </div>
  );
}
