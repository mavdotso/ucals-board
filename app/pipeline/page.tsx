"use client";
import { useState, useEffect, useRef } from "react";
import { Nav } from "@/app/components/Nav";
import { useCampaign } from "@/app/components/CampaignContext";
import { useCampaignTags } from "@/app/components/useCampaignTags";
import { CampaignTag } from "@/app/components/CampaignTag";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineConfig {
  id: string;
  name: string;
  icon: string;
  columns: string[];
  cardFields: FieldDef[];
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "url";
  options?: string[];
}

interface PipelineCard {
  id: string;
  pipelineId: string;
  column: string;
  title: string;
  fields: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

// ─── Pipeline Presets ────────────────────────────────────────────────────────

const PIPELINES: PipelineConfig[] = [
  {
    id: "content",
    name: "Content",
    icon: "📝",
    columns: ["Brief", "Drafting", "Review", "Dev", "Live"],
    cardFields: [
      { key: "keyword", label: "Target Keyword", type: "text" },
      { key: "agent", label: "Agent", type: "select", options: ["sage", "maya", "aria", "leo", "rex"] },
      { key: "url", label: "Target URL", type: "text" },
      { key: "wordCount", label: "Word Count", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    id: "social",
    name: "Social",
    icon: "📱",
    columns: ["Idea", "Draft", "Scheduled", "Posted", "Performing"],
    cardFields: [
      { key: "platform", label: "Platform", type: "select", options: ["x", "linkedin", "reddit", "hn", "ih"] },
      { key: "postType", label: "Type", type: "select", options: ["thread", "standalone", "article", "comment"] },
      { key: "hook", label: "Hook", type: "text" },
      { key: "scheduledDate", label: "Scheduled Date", type: "date" },
      { key: "sourceDoc", label: "Source Doc", type: "text" },
      { key: "liveLink", label: "Live Link", type: "url" },
    ],
  },
  {
    id: "email",
    name: "Email",
    icon: "✉️",
    columns: ["Draft", "Review", "Built", "Testing", "Live"],
    cardFields: [
      { key: "sequence", label: "Sequence Name", type: "text" },
      { key: "emailNum", label: "Email # (e.g. 3 of 5)", type: "text" },
      { key: "trigger", label: "Trigger", type: "select", options: ["signup", "day-3", "day-7", "churn", "manual"] },
      { key: "subject", label: "Subject Line", type: "text" },
      { key: "loopsStatus", label: "Loops.so Status", type: "select", options: ["not-started", "template-ready", "active", "paused"] },
    ],
  },
  {
    id: "outreach",
    name: "Outreach",
    icon: "🤝",
    columns: ["Research", "Draft", "Sent", "Replied", "Converted"],
    cardFields: [
      { key: "contact", label: "Contact Name", type: "text" },
      { key: "channel", label: "Channel", type: "select", options: ["email", "dm", "linkedin", "twitter"] },
      { key: "type", label: "Type", type: "select", options: ["youtuber", "blogger", "coach", "partner", "journalist"] },
      { key: "angle", label: "Personalization Angle", type: "text" },
      { key: "followUp", label: "Follow-up Date", type: "date" },
      { key: "outcome", label: "Outcome", type: "text" },
    ],
  },
  {
    id: "ads",
    name: "Ads",
    icon: "📣",
    columns: ["Research", "Brief", "Copy", "Creative", "Review", "Live", "Optimizing"],
    cardFields: [
      { key: "platform", label: "Platform", type: "select", options: ["meta", "google", "linkedin"] },
      { key: "audience", label: "Audience", type: "select", options: ["cold", "retargeting", "lookalike"] },
      { key: "budget", label: "Budget", type: "text" },
      { key: "format", label: "Format", type: "select", options: ["image", "video", "carousel"] },
      { key: "creativeLink", label: "Creative Link", type: "url" },
      { key: "performance", label: "Performance Notes", type: "text" },
    ],
  },
  {
    id: "launch",
    name: "Launch",
    icon: "🚀",
    columns: ["Prep", "Ready", "Submitted", "Live", "Follow-up"],
    cardFields: [
      { key: "channel", label: "Channel", type: "select", options: ["product-hunt", "app-store", "hn", "reddit", "press"] },
      { key: "assetType", label: "Asset Type", type: "select", options: ["listing", "post", "press-release", "media-kit"] },
      { key: "targetDate", label: "Target Date", type: "date" },
      { key: "owner", label: "Owner", type: "select", options: ["vlad", "todd"] },
      { key: "docLink", label: "Doc Link", type: "url" },
      { key: "results", label: "Results", type: "text" },
    ],
  },
];

// ─── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "ucals-pipeline-cards";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function loadCards(): PipelineCard[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveCards(cards: PipelineCard[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch {}
}

// ─── Column colors ───────────────────────────────────────────────────────────

const COL_COLORS = [
  "var(--text-muted)", // first col
  "var(--amber)",
  "#3B82F6",
  "var(--forest)",
  "var(--cranberry)",
  "#A855F7",
  "#EC4899",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [activePipeline, setActivePipeline] = useState(PIPELINES[0].id);
  const [editingCard, setEditingCard] = useState<PipelineCard | null>(null);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCards(loadCards()); }, []);
  useEffect(() => { if (cards.length || localStorage.getItem(STORAGE_KEY)) saveCards(cards); }, [cards]);

  const { activeCampaignId } = useCampaign();
  const { itemMatchesCampaign } = useCampaignTags();

  const pipeline = PIPELINES.find(p => p.id === activePipeline)!;
  const pipelineCards = cards
    .filter(c => c.pipelineId === activePipeline)
    .filter(c => itemMatchesCampaign(c.id, activeCampaignId));

  function addCard(column: string) {
    if (!newTitle.trim()) return;
    const card: PipelineCard = {
      id: uid(), pipelineId: activePipeline, column,
      title: newTitle.trim(), fields: {},
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setCards(prev => [...prev, card]);
    setNewTitle("");
    setAddingCol(null);
  }

  function updateCard(id: string, updates: Partial<PipelineCard>) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c));
  }

  function deleteCard(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
    setEditingCard(null);
  }

  function moveCard(id: string, toCol: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, column: toCol, updatedAt: Date.now() } : c));
  }

  // Drag handlers
  function onDragStart(cardId: string) { setDragCard(cardId); }
  function onDragOver(e: React.DragEvent, col: string) { e.preventDefault(); setDragOverCol(col); }
  function onDragLeave() { setDragOverCol(null); }
  function onDrop(col: string) {
    if (dragCard) moveCard(dragCard, col);
    setDragCard(null);
    setDragOverCol(null);
  }

  // Count per column
  const colCounts = pipeline.columns.reduce((acc, col) => {
    acc[col] = pipelineCards.filter(c => c.column === col).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/pipeline" right={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {PIPELINES.map(p => (
            <button key={p.id} onClick={() => setActivePipeline(p.id)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              background: activePipeline === p.id ? "var(--bg-card-elevated)" : "transparent",
              border: activePipeline === p.id ? "1px solid var(--border-default)" : "1px solid transparent",
              color: activePipeline === p.id ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: activePipeline === p.id ? 600 : 400,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 13 }}>{p.icon}</span>
              {p.name}
              {colCounts && pipelineCards.length > 0 && (
                <span style={{ fontSize: 10, opacity: 0.6 }}>({pipelineCards.length})</span>
              )}
            </button>
          ))}
        </div>
      } />

      {/* Kanban columns */}
      <div style={{
        flex: 1, display: "flex", gap: 12, padding: "16px 20px",
        overflowX: "auto", overflowY: "hidden",
      }}>
        {pipeline.columns.map((col, colIdx) => {
          const colCards = pipelineCards.filter(c => c.column === col);
          const colColor = COL_COLORS[colIdx % COL_COLORS.length];
          const isDropTarget = dragOverCol === col;

          return (
            <div key={col}
              onDragOver={(e) => onDragOver(e, col)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(col)}
              style={{
                flex: `0 0 ${Math.max(220, 100 / pipeline.columns.length)}px`,
                minWidth: 220, maxWidth: 300,
                display: "flex", flexDirection: "column",
                background: isDropTarget ? "rgba(59,130,246,0.04)" : "transparent",
                borderRadius: 10, transition: "background 0.15s",
              }}>
              {/* Column header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", marginBottom: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: colColor, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{col}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{colCards.length}</span>
                <button
                  onClick={() => { setAddingCol(col); setNewTitle(""); setTimeout(() => addInputRef.current?.focus(), 50); }}
                  style={{
                    marginLeft: "auto", background: "none", border: "none",
                    color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1,
                    padding: "0 2px",
                  }}
                >+</button>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingBottom: 60 }}>
                {/* Add card form */}
                {addingCol === col && (
                  <div style={{
                    padding: "10px", borderRadius: 8,
                    background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  }}>
                    <input
                      ref={addInputRef}
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCard(col); if (e.key === "Escape") setAddingCol(null); }}
                      placeholder="Card title…"
                      style={{
                        width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                        borderRadius: 5, padding: "6px 8px", color: "var(--text-primary)",
                        fontSize: 12, outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => addCard(col)} disabled={!newTitle.trim()} style={{
                        flex: 1, background: "var(--text-primary)", border: "none", borderRadius: 5,
                        padding: "5px", color: "var(--bg-app)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        opacity: newTitle.trim() ? 1 : 0.4,
                      }}>Add</button>
                      <button onClick={() => setAddingCol(null)} style={{
                        background: "none", border: "1px solid var(--border-subtle)", borderRadius: 5,
                        padding: "5px 10px", color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  </div>
                )}

                {colCards.sort((a, b) => b.updatedAt - a.updatedAt).map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => onDragStart(card.id)}
                    onClick={() => setEditingCard(card)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                    style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                      cursor: "grab", transition: "border-color 0.15s",
                      opacity: dragCard === card.id ? 0.4 : 1,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>{card.title}</div>
                    <div style={{ marginBottom: 4 }}><CampaignTag itemId={card.id} /></div>
                    {/* Show first non-empty fields as tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {pipeline.cardFields.slice(0, 3).map(f => {
                        const val = card.fields[f.key];
                        if (!val) return null;
                        return (
                          <span key={f.key} style={{
                            fontSize: 10, color: "var(--text-muted)",
                            background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                            borderRadius: 4, padding: "1px 6px",
                          }}>{val}</span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit card modal */}
      {editingCard && (
        <div
          onClick={() => setEditingCard(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: 12, padding: "24px", width: 420, maxHeight: "80vh", overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}>
            {/* Title */}
            <input
              value={editingCard.title}
              onChange={e => {
                const updated = { ...editingCard, title: e.target.value };
                setEditingCard(updated);
                updateCard(updated.id, { title: e.target.value });
              }}
              style={{
                width: "100%", fontSize: 16, fontWeight: 600, color: "var(--text-primary)",
                background: "transparent", border: "none", outline: "none",
                marginBottom: 16, boxSizing: "border-box",
              }}
            />

            {/* Move to column */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Column</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {pipeline.columns.map((col, i) => (
                  <button key={col} onClick={() => {
                    moveCard(editingCard.id, col);
                    setEditingCard({ ...editingCard, column: col });
                  }} style={{
                    padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                    background: editingCard.column === col ? COL_COLORS[i % COL_COLORS.length] : "var(--bg-secondary)",
                    border: editingCard.column === col ? "none" : "1px solid var(--border-subtle)",
                    color: editingCard.column === col ? "#fff" : "var(--text-muted)",
                    fontWeight: editingCard.column === col ? 600 : 400,
                  }}>{col}</button>
                ))}
              </div>
            </div>

            {/* Fields */}
            {pipeline.cardFields.map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={editingCard.fields[f.key] || ""}
                    onChange={e => {
                      const fields = { ...editingCard.fields, [f.key]: e.target.value };
                      setEditingCard({ ...editingCard, fields });
                      updateCard(editingCard.id, { fields });
                    }}
                    style={{
                      width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                      borderRadius: 6, padding: "7px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}>
                    <option value="">—</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                    value={editingCard.fields[f.key] || ""}
                    onChange={e => {
                      const fields = { ...editingCard.fields, [f.key]: e.target.value };
                      setEditingCard({ ...editingCard, fields });
                      updateCard(editingCard.id, { fields });
                    }}
                    placeholder={f.label}
                    style={{
                      width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                      borderRadius: 6, padding: "7px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => deleteCard(editingCard.id)} style={{
                background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer",
              }}>Delete</button>
              <button onClick={() => setEditingCard(null)} style={{
                background: "var(--text-primary)", border: "none", borderRadius: 6,
                padding: "6px 16px", color: "var(--bg-app)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {pipelineCards.length === 0 && !addingCol && (
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          textAlign: "center", color: "var(--text-muted)", fontSize: 13,
          pointerEvents: "none",
        }}>
          No cards yet — click + on any column to get started
        </div>
      )}
    </div>
  );
}
