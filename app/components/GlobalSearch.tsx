"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

const COLUMN_LABELS: Record<string, string> = {
  "inbox": "Inbox", "in-progress": "In Progress", "review": "Review", "done": "Done", "junk": "Junk",
};

const ASSIGNEE_COLORS: Record<string, string> = {
  aria: "#BD632F", maya: "#A4243B", leo: "#D8973C", sage: "#5C8A6C", rex: "#6B8A9C", vlad: "#A5A4A0",
};

interface GlobalSearchProps {
  onSelectCard: (id: Id<"cards">) => void;
}

export function GlobalSearch({ onSelectCard }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useQuery(api.search.global, q.length >= 2 ? { q, board: "marketing" } : "skip");

  // Cmd+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ("");
  }, [open]);

  const hasResults = results && (results.cards.length > 0 || results.docs.length > 0);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        background: "var(--bg-card)", border: "1px solid var(--border-default)",
        borderRadius: "7px", padding: "5px 12px",
        color: "var(--text-muted)", fontSize: "13px", cursor: "pointer",
        minWidth: "180px",
      }}
    >
      <span>⌘K</span>
      <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
    </button>
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "80px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div style={{
        background: "var(--bg-card-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        width: "100%", maxWidth: "560px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 16px", borderBottom: q.length >= 2 ? "1px solid var(--border-subtle)" : "none",
        }}>
          <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cards and documents…"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: "15px",
            }}
          />
          {q && (
            <button onClick={() => setQ("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}>×</button>
          )}
        </div>

        {/* Results */}
        {q.length >= 2 && (
          <div style={{ maxHeight: "420px", overflowY: "auto" }}>
            {!results && (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Searching…</div>
            )}

            {results && !hasResults && (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No results for &ldquo;{q}&rdquo;</div>
            )}

            {(results?.cards?.length ?? 0) > 0 && (
              <div>
                <div style={{ padding: "8px 16px 4px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Cards
                </div>
                {results?.cards?.map((card) => (
                  <div
                    key={card._id}
                    onClick={() => { onSelectCard(card._id); setOpen(false); }}
                    style={{
                      padding: "10px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{card.title}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{COLUMN_LABELS[card.column]}</span>
                      {card.assignee && (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: ASSIGNEE_COLORS[card.assignee], textTransform: "capitalize" }}>
                          {card.assignee}
                        </span>
                      )}
                    </div>
                    {card.description && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {card.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(results?.docs?.length ?? 0) > 0 && (
              <div>
                <div style={{ padding: "8px 16px 4px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Documents
                </div>
                {results?.docs?.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => { router.push(`/docs?id=${doc._id}`); setOpen(false); }}
                    style={{ padding: "10px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "3px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px" }}>📄</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{doc.title}</span>
                      {doc.agent && (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: ASSIGNEE_COLORS[doc.agent] ?? "var(--text-muted)", textTransform: "capitalize" }}>
                          {doc.agent}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{doc.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>↵ open</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Esc close</span>
        </div>
      </div>
    </div>
  );
}
