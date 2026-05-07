// src/pages/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { C, btn, input } from "../styles";

const HINTS = [
  "What's low on stock?",
  "Show me all outlets and their product counts",
  "Add a new outlet called 'Westside' at 789 Oak Ave",
  "Add a category called 'Beverages' to my first outlet",
  "Which products need restocking?",
  "Update stock for a product",
];

const ACTION_META = {
  update_inventory: { icon: "📦", label: "Inventory updated" },
  add_outlet:       { icon: "🏪", label: "Outlet added" },
  add_category:     { icon: "📂", label: "Category added" },
  add_product:      { icon: "✨", label: "Product added" },
};

// Lightweight markdown renderer: **bold**, *italic*, bullet lists, line breaks
function Markdown({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-\*]\s/.test(line.trim());
        const cleaned  = isBullet ? line.trim().replace(/^[•\-\*]\s/, "") : line;

        // Inline styles: **bold**, *italic*
        const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) => {
          if (/^\*\*[^*]+\*\*$/.test(part))
            return <strong key={j} style={{ color: "#fff" }}>{part.slice(2, -2)}</strong>;
          if (/^\*[^*]+\*$/.test(part))
            return <em key={j}>{part.slice(1, -1)}</em>;
          return part;
        });

        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {isBullet && <span style={{ color: C.accent, marginTop: 1, flexShrink: 0 }}>•</span>}
            <span style={{ lineHeight: 1.65 }}>{parts}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionBanner({ results, onClear }) {
  if (!results?.length) return null;

  return (
    <div style={{
      background: C.green + "18", border: `1px solid ${C.green}44`,
      borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {results.map((r, i) => {
            if (!r.executed)
              return <span key={i} style={{ color: C.red }}>⚠ {r.error || "Action failed"}</span>;
            const meta   = ACTION_META[r.type] || { icon: "✓", label: r.type };
            let detail   = "";
            if (r.type === "update_inventory") detail = ` — product #${r.product_id} → qty ${r.quantity}`;
            if (r.type === "add_outlet")       detail = ` — "${r.name}" (id:${r.id})`;
            if (r.type === "add_category")     detail = ` — "${r.name}" (id:${r.id})`;
            if (r.type === "add_product")      detail = ` — "${r.name}" @ $${r.price} (id:${r.id})`;
            return <span key={i} style={{ color: C.green }}>{meta.icon} {meta.label}{detail}</span>;
          })}
        </div>
        <button onClick={onClear}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, marginLeft: 12 }}>
          ×
        </button>
      </div>
    </div>
  );
}

const WELCOME = `👋 Hi! I'm the StoreIO assistant. I can help you manage your inventory through conversation.

**I can:**
• 📖 Answer questions about stock, prices, categories, and alerts
• 🏪 Add new store locations
• 📂 Create categories and subcategories
• ✨ Add new products with pricing and stock
• 📦 Update inventory quantities

Try one of the suggestions below!`;

export default function ChatPage() {
  const [messages, setMessages]     = useState([{ role: "assistant", content: WELCOME }]);
  const [input_, setInput]          = useState("");
  const [loading, setLoading]       = useState(false);
  const [lastResults, setLastResults] = useState(null);
  const [provider, setProvider]     = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || input_).trim();
    if (!q || loading) return;
    setInput("");

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "20px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800 }}>AI Assistant</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>
            {provider ? `Powered by ${provider === "gemini" ? "Gemini 2.0 Flash" : "Claude"}` : "Reads and writes live inventory data"}
          </p>
        </div>
        {messages.length > 1 && (
          <button style={btn("ghost", { fontSize: 12 })}
            onClick={() => { setMessages([{ role: "assistant", content: WELCOME }]); setLastResults(null); }}>
            Clear chat
          </button>
        )}
      </div>

      <ActionBanner results={lastResults} onClear={() => setLastResults(null)} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: C.accent + "33", border: `1px solid ${C.accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, marginRight: 8, marginTop: 2, flexShrink: 0,
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: "72%", padding: "11px 15px", borderRadius: 14, fontSize: 14,
              background: m.role === "user" ? C.accent : "#111827",
              color: m.role === "user" ? "#fff" : C.text,
              border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
            }}>
              {m.role === "assistant"
                ? <Markdown text={m.content} />
                : m.content
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: C.accent + "33", border: `1px solid ${C.accent}55`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>🤖</div>
            <div style={{
              padding: "11px 16px", borderRadius: 14, background: "#111827",
              border: `1px solid ${C.border}`, color: C.muted, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>Thinking</span>
              <span style={{ letterSpacing: 2, animation: "pulse 1.4s ease-in-out infinite" }}>…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Hint chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {HINTS.map((h, i) => (
          <button key={i} onClick={() => send(h)} style={{
            padding: "4px 12px", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 20,
            color: C.muted, fontSize: 12, cursor: "pointer", transition: "all .15s",
          }}>{h}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input style={{ ...input(), flex: 1, padding: "13px 18px" }}
          value={input_} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about inventory, or say 'Add outlet Downtown at 123 Main St'…"
          disabled={loading} />
        <button style={{ ...btn("primary"), padding: "13px 24px", fontSize: 14, justifyContent: "center" }}
          onClick={() => send()} disabled={loading || !input_.trim()}>
          Send
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
    </div>
  );
}
