"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
type Board = "marketing" | "product";
type Priority = "low" | "medium" | "high";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";

interface ParsedCard {
  title: string;
  description: string;
  priority: Priority;
  assignee: Assignee;
  category: "Marketing" | "Product" | "Idea";
}

const AGENT_COLORS: Record<Assignee, string> = {
  vlad: "#F5F4F2",
  aria: "#BD632F",
  maya: "#A4243B",
  leo: "#D8973C",
  sage: "#5C8A6C",
  rex: "#6B8A9C",
};

export function DocIntakeModal({ content, onClose }: { content: string; onClose: () => void }) {
  const [parsing, setParsing] = useState(false);
  const [cards, setCards] = useState<ParsedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createBulk = useMutation(api.cards.createBulk);

  async function parseDoc() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse");
      setCards(data.cards as ParsedCard[]);
    } catch (e: any) {
      setError(e.message ?? "Failed to parse document");
    } finally {
      setParsing(false);
    }
  }

  async function createCards() {
    if (!cards) return;
    setCreating(true);
    await createBulk({
      cards: cards.map((c) => ({
        title: c.title,
        description: c.description,
        assignee: c.assignee,
      })),
    });
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-card-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "640px",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              Document Intake
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Aria will parse this document and extract actionable tasks
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {!cards && !parsing && (
            <div>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "monospace",
                maxHeight: "200px",
                overflowY: "auto",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}>
                {content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)}…
              </div>
              {error && (
                <div style={{ color: "var(--cranberry)", fontSize: "13px", marginBottom: "12px" }}>{error}</div>
              )}
            </div>
          )}

          {parsing && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
              <div style={{ marginBottom: "8px", fontSize: "24px" }}>⚙️</div>
              Aria is reading the document…
            </div>
          )}

          {cards && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                {cards.length} tasks found — ready to create
              </div>
              {cards.map((card, i) => (
                <div key={i} style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{card.title}</span>
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px",
                        background: `${AGENT_COLORS[card.assignee]}22`,
                        color: AGENT_COLORS[card.assignee],
                        textTransform: "capitalize",
                      }}>
                        {card.assignee}
                      </span>
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "4px",
                        background: card.priority === "high" ? "#A4243B22" : card.priority === "medium" ? "#D8973C22" : "#5C8A6C22",
                        color: card.priority === "high" ? "#A4243B" : card.priority === "medium" ? "#D8973C" : "#5C8A6C",
                      }}>
                        {card.priority}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{card.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "1px solid var(--border-default)",
              borderRadius: "8px", padding: "8px 16px",
              color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {!cards ? (
            <button
              onClick={parseDoc}
              disabled={parsing}
              style={{
                background: "var(--text-primary)", border: "none",
                borderRadius: "8px", padding: "8px 20px",
                color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
                cursor: parsing ? "not-allowed" : "pointer",
                opacity: parsing ? 0.5 : 1,
              }}
            >
              {parsing ? "Parsing…" : "Parse with Aria"}
            </button>
          ) : (
            <button
              onClick={createCards}
              disabled={creating}
              style={{
                background: "var(--text-primary)", border: "none",
                borderRadius: "8px", padding: "8px 20px",
                color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
                cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.5 : 1,
              }}
            >
              {creating ? "Creating…" : `Create ${cards.length} cards`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
