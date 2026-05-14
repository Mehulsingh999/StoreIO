// src/pages/InventoryPage.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api";
import { C, btn, input, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { PageHeader, Empty, Spinner } from "../components/UI";
import { Search, Plus, Trash2, CheckCircle, Package } from "../icons";

const flattenTree = (nodes, depth = 0, path = "") => {
  const out = [];
  nodes.forEach(n => {
    const p = path ? `${path} > ${n.name}` : n.name;
    out.push({ id: n.id, name: n.name, depth, path: p, parent_id: n.parent_id, outlet_id: n.outlet_id });
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1, p));
  });
  return out;
};

const validateQty = (raw) => {
  if (raw === "" || raw === undefined) return null;
  if (!/^-?\d+$/.test(String(raw).trim())) return "Quantity must be a whole number";
  if (parseInt(raw, 10) < 0) return "Quantity cannot be negative";
  return null;
};

// ── CategoryPanel ─────────────────────────────────────────────────────────────
function CategoryPanel({ selOutlet, categories, onRefresh }) {
  const [name, setName]     = useState("");
  const [parent, setParent] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    const r = await api.addCategory({ name: name.trim(), parent_id: parent || null, outlet_id: selOutlet });
    if (!r.error) { setName(""); setParent(""); onRefresh(); }
  };

  const del = async (id) => { await api.deleteCategory(id); onRefresh(); };

  const charCount = name.length;

  return (
    <div className="si-slide" style={{ ...card(), marginBottom: 16, borderColor: `${C.accent}22` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
        Manage Categories
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", maxWidth: 200 }}>
          <input className="si-input" style={{ ...input(), maxWidth: 200 }} placeholder="Category name"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            maxLength={120} />
          {charCount > 80 && (
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: charCount >= 100 ? C.red : C.yellow, pointerEvents: "none",
            }}>{charCount}/100</span>
          )}
        </div>
        <select className="si-select" style={{ ...input(), maxWidth: 220 }} value={parent} onChange={e => setParent(e.target.value)}>
          <option value="">— Root level —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>
          ))}
        </select>
        <button className="si-btn-primary" style={btn("primary")} onClick={add} disabled={!name.trim()}>
          <Plus size={14} /> Add
        </button>
      </div>
      {categories.length === 0
        ? <p style={{ color: C.muted, fontSize: 13 }}>No categories yet</p>
        : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {categories.map(c => (
              <div key={c.id} className="si-chip" style={{
                background: C.surface, borderRadius: 6, padding: "4px 8px 4px 10px",
                fontSize: 12, display: "flex", alignItems: "center", gap: 5,
                border: `1px solid ${C.border}`,
              }}>
                <span style={{ color: C.muted, fontSize: 10 }}>{"›".repeat(c.depth + 1)}</span>
                {c.name}
                <button onClick={() => del(c.id)} style={{
                  background: "none", border: "none", color: C.muted,
                  cursor: "pointer", padding: "1px 2px", display: "flex",
                  transition: "color .15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── AddProductForm ────────────────────────────────────────────────────────────
function AddProductForm({ selOutlet, categories, onDone }) {
  const [form, setForm]         = useState({ name: "", category_id: "", price: "", sku: "" });
  const [priceError, setPriceError] = useState("");

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [k]: v }));
    if (k === "price") {
      const n = parseFloat(v);
      if (v !== "" && (isNaN(n) || n < 0 || n > 999999)) {
        setPriceError("Price must be 0–999,999");
      } else {
        setPriceError("");
      }
    }
  };

  const add = async () => {
    if (!form.name.trim() || !form.category_id || priceError) return;
    const r = await api.addProduct({ ...form, outlet_id: selOutlet, price: parseFloat(form.price) || 0 });
    if (!r.error) { setForm({ name: "", category_id: "", price: "", sku: "" }); onDone(); }
  };

  const nameLen = form.name.length;

  return (
    <div className="si-slide" style={{ ...card(), marginBottom: 16, borderColor: `${C.accent}22` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
        New Product
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", maxWidth: 220 }}>
          <input className="si-input" style={{ ...input(), maxWidth: 220 }} placeholder="Product name *"
            value={form.name} onChange={set("name")} maxLength={120} />
          {nameLen > 80 && (
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: nameLen >= 100 ? C.red : C.yellow, pointerEvents: "none",
            }}>{nameLen}/100</span>
          )}
        </div>
        <select className="si-select" style={{ ...input(), maxWidth: 220 }} value={form.category_id} onChange={set("category_id")}>
          <option value="">Select category *</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>
          ))}
        </select>
        <div>
          <input className="si-input" style={{ ...input(), maxWidth: 110 }} placeholder="Price $" type="number"
            value={form.price} onChange={set("price")} min="0" max="999999" />
          {priceError && <div style={{ color: C.red, fontSize: 11, marginTop: 3 }}>{priceError}</div>}
        </div>
        <input className="si-input" style={{ ...input(), maxWidth: 140 }} placeholder="SKU (optional)"
          value={form.sku} onChange={set("sku")} />
        <button className="si-btn-primary" style={btn("primary")} onClick={add}
          disabled={!form.name.trim() || !form.category_id || !!priceError}>
          <Plus size={14} /> Add Product
        </button>
        <button className="si-btn-ghost" style={btn("ghost")} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ── StockBar ──────────────────────────────────────────────────────────────────
const StockBar = ({ qty, threshold }) => {
  const pct   = Math.min(100, threshold > 0 ? (qty / threshold) * 100 : 100);
  const color = qty <= threshold ? C.red : qty < threshold * 2 ? C.yellow : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 28 }}>{qty}</span>
      <div style={{ width: 44, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .3s" }} />
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { outlets }                     = useApp();
  const [selOutlet, setSelOutlet]       = useState(null);
  const [categories, setCategories]     = useState([]);
  const [products, setProducts]         = useState([]);
  const [editQty, setEditQty]           = useState({});
  const [qtyErrors, setQtyErrors]       = useState({});
  const [saving, setSaving]             = useState({});
  const [saved, setSaved]               = useState({});
  const [filter, setFilter]             = useState("");
  const [showAdd, setShowAdd]           = useState(false);
  const [showCats, setShowCats]         = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (outlets.length && !selOutlet) setSelOutlet(outlets[0].id);
  }, [outlets, selOutlet]);

  const loadProducts = useCallback(() => {
    if (!selOutlet) return;
    setLoading(true);
    api.getProducts({ outlet_id: selOutlet })
      .then(d => { if (Array.isArray(d)) setProducts(d); })
      .finally(() => setLoading(false));
  }, [selOutlet]);

  const loadCategories = useCallback(() => {
    if (!selOutlet) return;
    api.getCategories(selOutlet).then(d => setCategories(flattenTree(d)));
  }, [selOutlet]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    setEditQty({});
    setQtyErrors({});
  }, [loadProducts, loadCategories]);

  const saveQty = async (p) => {
    const key  = `${p.id}-${p.outlet_id}`;
    const raw  = editQty[key];
    const err  = validateQty(raw);
    if (err) return;
    const newQ = parseInt(raw, 10);
    if (isNaN(newQ)) return;

    if (p.quantity > 0 && newQ > p.quantity * 10) {
      if (!confirm(`Set quantity to ${newQ}? That's more than 10× the current stock (${p.quantity}). Confirm?`)) return;
    }

    setSaving(s => ({ ...s, [key]: true }));
    await api.updateQty(p.id, p.outlet_id, { quantity: newQ, prev_qty: p.quantity });
    setSaving(s => ({ ...s, [key]: false }));
    setSaved(s => ({ ...s, [key]: true }));
    setTimeout(() => setSaved(s => { const x = { ...s }; delete x[key]; return x; }), 1400);
    setEditQty(e => { const x = { ...e }; delete x[key]; return x; });
    setQtyErrors(errs => { const x = { ...errs }; delete x[key]; return x; });
    loadProducts();
  };

  const delProduct = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await api.deleteProduct(p.id);
    loadProducts();
  };

  const filtered = useMemo(() =>
    !filter.trim() ? products
      : products.filter(p =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.category_name?.toLowerCase().includes(filter.toLowerCase())
        ),
    [products, filter]
  );

  const TH = ({ label }) => (
    <th style={{
      textAlign: "left", padding: "11px 16px",
      color: C.muted, fontWeight: 600, fontSize: 10,
      letterSpacing: 1.1, textTransform: "uppercase",
      borderBottom: `1px solid ${C.border}`,
      whiteSpace: "nowrap",
    }}>{label}</th>
  );

  return (
    <div className="si-page" style={{ padding: "32px 36px" }}>
      <PageHeader
        title="Inventory"
        subtitle={`${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
        actions={<>
          <button className="si-btn-ghost" style={btn("ghost")}
            onClick={() => { setShowCats(v => !v); setShowAdd(false); }}>
            ⚙ Categories
          </button>
          <button className="si-btn-primary" style={btn("primary")}
            onClick={() => { setShowAdd(v => !v); setShowCats(false); }}>
            <Plus size={14} /> Add Product
          </button>
        </>}
      />

      {/* Outlet tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {outlets.map(o => (
          <button key={o.id} className="si-tab" onClick={() => setSelOutlet(o.id)} style={{
            padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: selOutlet === o.id ? 600 : 400,
            background: selOutlet === o.id
              ? "linear-gradient(135deg,#3b82f6,#6366f1)"
              : C.surface,
            color:     selOutlet === o.id ? "#fff" : C.muted,
            boxShadow: selOutlet === o.id ? "0 2px 10px rgba(59,130,246,.3)" : "none",
          }}>{o.name}</button>
        ))}
        {outlets.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13, padding: "6px 0" }}>No outlets yet — add one in Outlets</p>
        )}
      </div>

      {showCats && selOutlet && (
        <CategoryPanel selOutlet={selOutlet} categories={categories} onRefresh={loadCategories} />
      )}
      {showAdd && selOutlet && (
        <AddProductForm selOutlet={selOutlet} categories={categories}
          onDone={() => { setShowAdd(false); loadProducts(); }} />
      )}

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 340, marginBottom: 16 }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Search size={15} stroke={C.muted} />
        </div>
        <input
          className="si-input"
          style={{ ...input(), paddingLeft: 36 }}
          placeholder="Search products or categories…"
          value={filter} onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="si-table-wrap" style={{ ...card(), padding: 0, overflow: "hidden" }}>
        {loading
          ? <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner /></div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  <TH label="Product" />
                  <TH label="Category" />
                  <TH label="Price" />
                  <TH label="Stock" />
                  <TH label="Threshold" />
                  <TH label="Update" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const key     = `${p.id}-${p.outlet_id}`;
                  const isSaved = saved[key];
                  const qtyErr  = qtyErrors[key];

                  return (
                    <tr key={p.id} className="si-table-row">
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: C.text }}>
                        {p.name}
                        {p.sku && <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{p.sku}</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: C.muted, fontSize: 12 }}>{p.category_name}</td>
                      <td style={{ padding: "12px 16px", color: C.purple, fontWeight: 600 }}>
                        ${p.price.toFixed(2)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <StockBar qty={p.quantity} threshold={p.threshold} />
                      </td>
                      <td style={{ padding: "12px 16px", color: C.muted }}>{p.threshold}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>
                          <div className="si-row-actions" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input type="number"
                              className="si-input"
                              style={{
                                ...input(), width: 72, padding: "5px 8px", fontSize: 12,
                                borderColor: qtyErr ? C.red + "88" : undefined,
                              }}
                              placeholder={String(p.quantity)}
                              value={editQty[key] ?? ""}
                              onChange={e => {
                                const v = e.target.value;
                                setEditQty(q => ({ ...q, [key]: v }));
                                setQtyErrors(errs => ({ ...errs, [key]: validateQty(v) }));
                              }}
                              onKeyDown={e => e.key === "Enter" && !qtyErr && saveQty(p)}
                            />
                            {(editQty[key] !== undefined || isSaved) && (
                              isSaved
                                ? <div style={{ color: C.green, display: "flex", animation: "popIn .18s ease" }}>
                                    <CheckCircle size={18} stroke={C.green} />
                                  </div>
                                : <button className="si-btn-success"
                                    style={{ ...btn("success"), padding: "5px 10px", fontSize: 12 }}
                                    onClick={() => saveQty(p)} disabled={saving[key] || !!qtyErr}>
                                    {saving[key] ? "…" : "Save"}
                                  </button>
                            )}
                            <button className="si-btn-danger"
                              style={{ ...btn("danger"), padding: "5px 8px", fontSize: 12 }}
                              onClick={() => delProduct(p)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {qtyErr && (
                            <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>{qtyErr}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <Empty icon={<Package size={20} stroke={C.muted} />}
                        message={loading ? "Loading…" : "No products found"} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
