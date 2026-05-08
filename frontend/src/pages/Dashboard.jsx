// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { api } from "../api";
import { C, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { StatCard, Empty, Skeleton } from "../components/UI";
import { Package, Store, BarChart3, AlertTriangle, Activity, Layers } from "../icons";

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
  const { outlets }          = useApp();
  const [alerts, setAlerts]  = useState([]);
  const [log, setLog]        = useState([]);
  const [inv, setInv]        = useState([]);
  const [loading, setLoading] = useState(true);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  useEffect(() => {
    Promise.all([
      api.getAlerts().then(d => Array.isArray(d) && setAlerts(d)),
      api.getLog().then(d => Array.isArray(d) && setLog(d)),
      api.getInventory().then(d => Array.isArray(d) && setInv(d)),
    ]).finally(() => setLoading(false));
  }, []);

  const totalStock   = inv.reduce((s, i) => s + i.quantity, 0);
  const today        = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="si-page" style={{ padding: "32px 36px", maxWidth: 1280 }}>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg,rgba(59,130,246,.08),rgba(99,102,241,.06))",
        border: `1px solid rgba(59,130,246,.14)`,
        borderRadius: 16, padding: "22px 26px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 20, fontFamily: "'Syne',sans-serif", fontWeight: 800, marginBottom: 4 }}>
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

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        {loading ? (
          [0,1,2,3].map(i => (
            <div key={i} style={{ ...card(), minHeight: 100 }}>
              <Skeleton height={10} width="60%" style={{ marginBottom: 14 }} />
              <Skeleton height={30} width="50%" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Outlets"          value={outlets.length} color={C.accent}  icon={Store}       />
            <StatCard label="Products tracked" value={inv.length}     color={C.purple}  icon={Package}     />
            <StatCard label="Total units"      value={totalStock}     color={C.green}   icon={Layers}      />
            <StatCard label="Low stock alerts" value={alerts.length}  color={alerts.length > 0 ? C.red : C.muted} icon={AlertTriangle} />
          </>
        )}
      </div>

      {/* Content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

        {/* Low stock */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.red + "18", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={14} stroke={C.red} />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Low Stock</span>
            {alerts.length > 0 && (
              <span style={{
                marginLeft: "auto", background: C.red + "20", color: C.red,
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                border: `1px solid ${C.red}33`,
              }}>{alerts.length}</span>
            )}
          </div>

          {loading
            ? [0,1,2,3].map(i => (
                <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}22`, display: "flex", justifyContent: "space-between" }}>
                  <Skeleton width="55%" height={13} />
                  <Skeleton width="18%" height={13} />
                </div>
              ))
            : alerts.length === 0
              ? <Empty icon={<AlertTriangle size={20} stroke={C.muted} />} message="All stock levels healthy" />
              : alerts.slice(0, 7).map((a, i) => {
                  const pct = Math.min(100, (a.quantity / (a.threshold || 5)) * 100);
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
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: pct < 30 ? C.red : C.yellow,
                          borderRadius: 2, transition: "width .4s ease",
                        }} />
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Recent activity */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Activity size={14} stroke={C.accent} />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Recent Activity</span>
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
              : log.slice(0, 7).map((r, i) => {
                  const isPos  = r.qty_added >= 0;
                  const initials = r.by_user?.[0]?.toUpperCase() ?? "?";
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "flex-start" }}>
                      {/* Avatar */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: isPos ? C.green + "22" : C.red + "22",
                        border: `1px solid ${(isPos ? C.green : C.red) + "44"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: isPos ? C.green : C.red,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.product}
                          </span>
                          <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 8 }}>{timeAgo(r.created_at)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: isPos ? C.green : C.red,
                          }}>
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

        {/* Outlet health summary */}
        <div style={{ ...card(), gridColumn: "1/-1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.purple + "18", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Store size={14} stroke={C.purple} />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Outlet Summary</span>
          </div>

          {loading
            ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                {[0,1,2].map(i => <div key={i} style={{ height: 80 }}><Skeleton height="100%" style={{ borderRadius: 10 }} /></div>)}
              </div>
            )
            : outlets.length === 0
              ? <Empty icon={<Store size={20} stroke={C.muted} />} message="No outlets yet — add one in Outlets" />
              : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                  {outlets.map(o => {
                    const items = inv.filter(i => i.outlet_id === o.id);
                    const units = items.reduce((s, i) => s + i.quantity, 0);
                    const low   = items.filter(i => i.low_stock || i.quantity <= i.threshold).length;
                    const health = items.length ? Math.max(0, 100 - (low / items.length) * 100) : 100;

                    return (
                      <div key={o.id} className="si-outlet-card" style={{
                        background: C.surface,
                        borderRadius: 12, padding: "14px 16px",
                        border: `1px solid ${C.border}`,
                        overflow: "hidden", position: "relative",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{o.name}</div>
                          {low > 0 && (
                            <span style={{
                              background: C.red + "20", color: C.red, fontSize: 10,
                              fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                              border: `1px solid ${C.red}30`,
                            }}>
                              {low} low
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                          {items.length} products · {units} units
                        </div>
                        <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${health}%`,
                            background: health > 80 ? C.green : health > 50 ? C.yellow : C.red,
                            borderRadius: 2, transition: "width .5s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}
