// src/pages/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { C, btn, input } from "../styles";
import { Bot, Send, CheckCircle, AlertTriangle, X } from "../icons";

const HINTS = [
  "What's low on stock?",
  "Show me all outlets",
  "Add outlet 'Westside' at 789 Oak Ave",
  "Add category 'Beverages' to my first outlet",
  "Which products need restocking?",
  "Update stock for a product",
];

const ACTION_META = {
  update_inventory: { label: "Inventory updated" },
  add_outlet:       { label: "Outlet added"      },
  add_category:     { label: "Category added"    },
  add_product:      { label: "Product added"     },
};

// Lightweight markdown: **bold**, *italic*, bullet lists
function Markdown({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-*]\s/.test(line.trim());
        const cleaned  = isBullet ? line.trim().replace(/^[•\-*]\s/, "") : line;
        const parts    = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) => {
          if (/^\*\*[^*]+\*\*$/.test(part))
            return <strong key={j} style={{ color: "#fff" }}>{part.slice(2, -2)}</strong>;
          if (/^\*[^*]+\*$/.test(part))
            return <em key={j}>{part.slice(1, -1)}</em>;
          return part;
        });
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {isBullet && <span style={{ color: C.accent, marginTop: 1, flexShrink: 0, fontSize: 10 }}>●</span>}
            <span style={{ lineHeight: 1.65 }}>{parts}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionBanner({ results, onClear }) {
  if (!results?.length) return null;
  const hasError = results.some(r => !r.executed);

  return (
    <div className="si-slide" style={{
      background: hasError ? `${C.yellow}12` : `${C.green}12`,
      border: `1px solid ${hasError ? C.yellow : C.green}35`,
      borderLeft: `4px solid ${hasError ? C.yellow : C.green}`,
      borderRadius: "0 10px 10px 0",
      padding: "12px 14px", marginBottom: 14, fontSize: 13,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {results.map((r, i) => {
            if (!r.executed)
              return (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", color: C.yellow }}>
                  <AlertTriangle size={13} /> {r.error || "Action failed"}
                </div>
              );
            const meta   = ACTION_META[r.type] || { label: r.type };
            let detail   = "";
            if (r.type === "update_inventory") detail = ` — product #${r.product_id} → qty ${r.quantity}`;
            if (r.type === "add_outlet")       detail = ` — "${r.name}"`;
            if (r.type === "add_category")     detail = ` — "${r.name}"`;
            if (r.type === "add_product")      detail = ` — "${r.name}" @ $${r.price}`;
            return (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", color: C.green }}>
                <CheckCircle size={13} /> {meta.label}{detail}
              </div>
            );
          })}
        </div>
        <button onClick={onClear} style={{
          background: "none", border: "none", color: C.muted, cursor: "pointer",
          padding: 2, display: "flex", marginLeft: 12, flexShrink: 0,
        }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// 3-dot bounce loader
const BounceDots = () => (
  <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 6, height: 6, borderRadius: "50%",
        background: C.accent,
        animation: `bounceDot 1.2s ease-in-out infinite`,
        animationDelay: `${i * 0.18}s`,
      }} />
    ))}
  </div>
);

const WELCOME = `👋 Hi! I'm the StoreIO assistant. I can help you manage your inventory through conversation.

**I can:**
• Answer questions about stock, prices, categories, and alerts
• Add new store locations
• Create categories and subcategories
• Add new products with pricing and stock
• Update inventory quantities

Try one of the suggestions below!`;

export default function ChatPage() {
  const [messages, setMessages]       = useState([{ role: "assistant", content: WELCOME }]);
  const [inputVal, setInputVal]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [lastResults, setLastResults] = useState(null);
  const [provider, setProvider]       = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || inputVal).trim();
    if (!q || loading) return;
    setInputVal("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    const data = await api.chat(next.map(m => ({ role: m.role, content: m.content })));
    setLoading(false);
    if (data.provider)                              setProvider(data.provider);
    if (data.actionResults?.some(r => r.executed)) setLastResults(data.actionResults);
    setMessages(m => [...m, { role: "assistant", content: data.reply || data.error || "Error — check backend logs." }]);
  };

  return (
    <div className="si-chat-page" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(59,130,246,.35)",
          }}>
            <Bot size={18} stroke="#fff" />
          </div>
          <div>
            <h1 className="si-gradient-title" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -.3 }}>AI Assistant</h1>
            <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {provider ? `Powered by ${provider === "anthropic" ? "Claude Sonnet 4.5" : provider}` : "Reads and writes live inventory data"}
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <button className="si-btn-ghost" style={{ ...btn("ghost"), fontSize: 12 }}
            onClick={() => { setMessages([{ role: "assistant", content: WELCOME }]); setLastResults(null); }}>
            Clear chat
          </button>
        )}
      </div>

      <ActionBanner results={lastResults} onClear={() => setLastResults(null)} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 14, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end",
            gap: 10,
          }}>
            {m.role === "assistant" && (
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(59,130,246,.3)",
              }}>
                <Bot size={14} stroke="#fff" />
              </div>
            )}

            <div style={{
              maxWidth: "72%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              fontSize: 14,
              background: m.role === "user"
                ? "linear-gradient(135deg,#3b82f6,#4f46e5)"
                : "#0f1824",
              color: m.role === "user" ? "#fff" : C.text,
              border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              boxShadow: m.role === "user" ? "0 2px 10px rgba(59,130,246,.25)" : "none",
              lineHeight: 1.6,
            }}>
              {m.role === "assistant"
                ? <Markdown text={m.content} />
                : m.content
              }
            </div>

            {m.role === "user" && (
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 12,
              }}>
                {(() => { try { return JSON.parse(localStorage.getItem("user"))?.username?.[0]?.toUpperCase() ?? "U"; } catch { return "U"; } })()}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: "linear-gradient(135deg,#3b82f6,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(59,130,246,.3)",
            }}>
              <Bot size={14} stroke="#fff" />
            </div>
            <div style={{
              padding: "12px 16px", borderRadius: "18px 18px 18px 4px",
              background: "#0f1824", border: `1px solid ${C.border}`,
            }}>
              <BounceDots />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Hint chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {HINTS.map((h, i) => (
          <button key={i} className="si-chip" onClick={() => send(h)} style={{
            padding: "5px 13px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20, color: C.muted, fontSize: 12, cursor: "pointer",
          }}>{h}</button>
        ))}
      </div>

      {/* Input row */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: "rgba(13,17,23,0.9)",
        border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "6px 6px 6px 16px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 -4px 20px rgba(0,0,0,.2)",
      }}>
        <input
          className="si-input"
          style={{
            flex: 1, background: "none", border: "none",
            color: C.text, fontSize: 14, outline: "none",
            padding: "8px 0",
          }}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about inventory, or say 'Add outlet Downtown at 123 Main St'…"
          disabled={loading}
        />
        <button
          className="si-btn-primary"
          style={{
            ...btn("primary"),
            width: 42, height: 42, padding: 0, borderRadius: 10,
            flexShrink: 0, justifyContent: "center",
            background: inputVal.trim() && !loading
              ? "linear-gradient(135deg,#3b82f6,#6366f1)"
              : C.border,
            boxShadow: inputVal.trim() && !loading ? "0 2px 10px rgba(59,130,246,.35)" : "none",
            transition: "all .2s",
          }}
          onClick={() => send()}
          disabled={loading || !inputVal.trim()}
        >
          <Send size={16} stroke="#fff" />
        </button>
      </div>
    </div>
  );
}
