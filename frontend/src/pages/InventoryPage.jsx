// src/pages/InventoryPage.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api";
import { C, btn, input, card } from "../styles";
import { useApp } from "../contexts/AppContext";
import { PageHeader, Empty, Spinner } from "../components/UI";

// Flatten category tree → [{ id, name, depth, path }]
const flattenTree = (nodes, depth = 0, path = "") => {
  const out = [];
  nodes.forEach(n => {
    const p = path ? `${path} > ${n.name}` : n.name;
    out.push({ id: n.id, name: n.name, depth, path: p, parent_id: n.parent_id, outlet_id: n.outlet_id });
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1, p));
  });
  return out;
};

// ── Sub-components ────────────────────────────────────────────────────────────
function CategoryPanel({ selOutlet, categories, onRefresh }) {
  const [name, setName]     = useState("");
  const [parent, setParent] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    const r = await api.addCategory({ name: name.trim(), parent_id: parent || null, outlet_id: selOutlet });
    if (!r.error) { setName(""); setParent(""); onRefresh(); }
  };

  const del = async (id) => {
    await api.deleteCategory(id);
    onRefresh();
  };

  return (
    <div style={{ ...card(), marginBottom: 20 }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
        Manage Categories
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...input(), maxWidth: 200 }} placeholder="Category name"
          value={name} onChange={e => setName(e.target.value)} />
        <select style={{ ...input(), maxWidth: 220 }} value={parent} onChange={e => setParent(e.target.value)}>
          <option value="">— Root level —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>
          ))}
        </select>
        <button style={btn("primary")} onClick={add} disabled={!name.trim()}>Add</button>
      </div>
      {categories.length === 0
        ? <p style={{ color: C.muted, fontSize: 13 }}>No categories yet</p>
        : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map(c => (
              <div key={c.id} style={{
                background: C.surface, borderRadius: 6, padding: "4px 10px",
                fontSize: 12, display: "flex", alignItems: "center", gap: 6,
                border: `1px solid ${C.border}`,
              }}>
                <span style={{ color: C.muted }}>{"›".repeat(c.depth + 1)}</span>
                {c.name}
                <button onClick={() => del(c.id)}
                  style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: "0 2px" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function AddProductForm({ selOutlet, categories, onDone }) {
  const [form, setForm] = useState({ name: "", category_id: "", price: "", sku: "" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const add = async () => {
    if (!form.name.trim() || !form.category_id) return;
    const r = await api.addProduct({ ...form, outlet_id: selOutlet, price: parseFloat(form.price) || 0 });
    if (!r.error) { setForm({ name: "", category_id: "", price: "", sku: "" }); onDone(); }
  };

  return (
    <div style={{ ...card(), marginBottom: 20 }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
        New Product
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input style={{ ...input(), maxWidth: 220 }} placeholder="Product name *"
          value={form.name} onChange={set("name")} />
        <select style={{ ...input(), maxWidth: 220 }} value={form.category_id} onChange={set("category_id")}>
          <option value="">Select category *</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>
          ))}
        </select>
        <input style={{ ...input(), maxWidth: 110 }} placeholder="Price $" type="number"
          value={form.price} onChange={set("price")} />
        <input style={{ ...input(), maxWidth: 140 }} placeholder="SKU (optional)"
          value={form.sku} onChange={set("sku")} />
        <button style={btn("primary")} onClick={add}
          disabled={!form.name.trim() || !form.category_id}>Add Product</button>
        <button style={btn("ghost")} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { outlets }               = useApp();
  const [selOutlet, setSelOutlet] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts]   = useState([]);
  const [editQty, setEditQty]     = useState({});
  const [saving, setSaving]       = useState({});
  const [filter, setFilter]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [showCats, setShowCats]   = useState(false);
  const [loading, setLoading]     = useState(false);

  // Auto-select first outlet
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
  }, [loadProducts, loadCategories]);

  const saveQty = async (p) => {
    const key  = `${p.id}-${p.outlet_id}`;
    const newQ = parseInt(editQty[key]);
    if (isNaN(newQ)) return;
    setSaving(s => ({ ...s, [key]: true }));
    await api.updateQty(p.id, p.outlet_id, { quantity: newQ, prev_qty: p.quantity });
    setSaving(s => ({ ...s, [key]: false }));
    setEditQty(e => { const x = { ...e }; delete x[key]; return x; });
    loadProducts();
  };

  const delProduct = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await api.deleteProduct(p.id);
    loadProducts();
  };

  const filtered = useMemo(() =>
    !filter.trim()
      ? products
      : products.filter(p =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.category_name?.toLowerCase().includes(filter.toLowerCase())
        ),
    [products, filter]
  );

  const TH = ({ label }) => (
    <th style={{ textAlign: "left", padding: "12px 16px", color: C.muted, fontWeight: 500, fontSize: 11, letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>
      {label}
    </th>
  );

  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        title="Inventory"
        subtitle={`${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
        actions={<>
          <button style={btn("ghost")} onClick={() => setShowCats(v => !v)}>⚙ Categories</button>
          <button style={btn("primary")} onClick={() => setShowAdd(v => !v)}>+ Add Product</button>
        </>}
      />

      {/* Outlet tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {outlets.map(o => (
          <button key={o.id} onClick={() => setSelOutlet(o.id)} style={{
            padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13,
            background: selOutlet === o.id ? C.accent   : C.surface,
            color:      selOutlet === o.id ? "#fff"     : C.muted,
            fontWeight: selOutlet === o.id ? 600        : 400,
            transition: "all .15s",
          }}>{o.name}</button>
        ))}
        {outlets.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13 }}>No outlets yet — add one in Outlets</p>
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
      <input style={{ ...input(), maxWidth: 320, marginBottom: 16 }}
        placeholder="🔍  Search products or categories…"
        value={filter} onChange={e => setFilter(e.target.value)} />

      {/* Table */}
      <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
        {loading
          ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {["Product", "Category", "Price", "Stock", "Threshold", "Actions"].map(h => (
                    <TH key={h} label={h.toUpperCase()} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const key = `${p.id}-${p.outlet_id}`;
                  const low = p.quantity <= p.threshold;
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? C.card : "#0f1623", borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                        {p.name}
                        {p.sku && <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{p.sku}</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: C.muted }}>{p.category_name}</td>
                      <td style={{ padding: "12px 16px", color: C.purple }}>${p.price.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: low ? C.red : p.quantity < 10 ? C.yellow : C.green, fontWeight: 600 }}>
                          {low && "⚠ "}{p.quantity}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.muted }}>{p.threshold}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="number" style={{ ...input(), width: 72, padding: "5px 8px", fontSize: 12 }}
                            placeholder={String(p.quantity)}
                            value={editQty[key] ?? ""}
                            onChange={e => setEditQty(q => ({ ...q, [key]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && saveQty(p)} />
                          {editQty[key] !== undefined && (
                            <button style={btn("success", { padding: "5px 10px", fontSize: 12 })}
                              onClick={() => saveQty(p)} disabled={saving[key]}>
                              {saving[key] ? "…" : "Save"}
                            </button>
                          )}
                          <button style={btn("danger", { padding: "5px 8px", fontSize: 12 })}
                            onClick={() => delProduct(p)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.muted }}>
                      {loading ? "Loading…" : "No products found"}
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
