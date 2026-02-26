"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/app/components/Nav";
import { useCampaign } from "@/app/components/CampaignContext";
import { CampaignTag } from "@/app/components/CampaignTag";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StageMeta {
  description: string;
  agent: string;
  trigger: string;
  output: string;
}

interface PipelineConfig {
  id: string;
  name: string;
  icon: string;
  columns: string[];
  stages: Record<string, StageMeta>;
  cardFields: FieldDef[];
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "url";
  options?: string[];
}

interface PipelineCard {
  _id: Id<"pipelineCards">;
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
    stages: {
      "Brief": { description: "Keyword research + content brief creation", agent: "SEO/GEO", trigger: "Manual: new keyword opportunity", output: "Content brief doc" },
      "Drafting": { description: "Write article from brief", agent: "Copy", trigger: "Auto: brief approved", output: "Draft article (MDX)" },
      "Review": { description: "Quality + SEO check", agent: "Strategy", trigger: "Auto: draft complete", output: "Reviewed draft with edits" },
      "Dev": { description: "Publish to blog + index", agent: "Vlad", trigger: "Auto: review approved", output: "Published URL" },
      "Live": { description: "Monitor rankings + traffic", agent: "SEO/GEO", trigger: "Auto: published", output: "Performance report" },
    },
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
    stages: {
      "Idea": { description: "Content idea or angle brainstorm", agent: "Social", trigger: "Manual or content calendar", output: "Post concept + angle" },
      "Draft": { description: "Write post copy + select media", agent: "Copy", trigger: "Auto: idea approved", output: "Post copy + media" },
      "Scheduled": { description: "Queue via Typefully or manual", agent: "Social", trigger: "Auto: draft approved", output: "Scheduled post with time" },
      "Posted": { description: "Published and monitored", agent: "Social", trigger: "Auto: scheduled time hit", output: "Live link + initial metrics" },
      "Performing": { description: "High engagement — amplify or repurpose", agent: "Strategy", trigger: "Auto: >2x avg engagement", output: "Repurpose brief" },
    },
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
    stages: {
      "Draft": { description: "Write email copy from sequence plan", agent: "Copy", trigger: "Manual: sequence planned", output: "Email copy (plain text)" },
      "Review": { description: "Strategy + tone review", agent: "Strategy", trigger: "Auto: draft complete", output: "Approved copy with edits" },
      "Built": { description: "Template built in Loops.so", agent: "Copy", trigger: "Auto: review approved", output: "Loops.so template" },
      "Testing": { description: "Send test + check rendering", agent: "Vlad", trigger: "Manual: template ready", output: "Test results" },
      "Live": { description: "Automation active in Loops.so", agent: "Vlad", trigger: "Manual: test approved", output: "Active automation + metrics" },
    },
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
    stages: {
      "Research": { description: "Find and qualify prospects", agent: "Social", trigger: "Manual: campaign planned", output: "Prospect list with angles" },
      "Draft": { description: "Write personalized outreach", agent: "Copy", trigger: "Auto: research complete", output: "Outreach draft" },
      "Sent": { description: "Message delivered, awaiting reply", agent: "Social", trigger: "Manual: draft approved", output: "Sent confirmation" },
      "Replied": { description: "Response received — follow up", agent: "Social", trigger: "Auto: reply detected", output: "Conversation thread" },
      "Converted": { description: "Goal achieved (review, share, collab)", agent: "Strategy", trigger: "Manual: outcome confirmed", output: "Outcome record" },
    },
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
    stages: {
      "Research": { description: "Competitor research via Foreplay API", agent: "Paid Ads", trigger: "Manual or scraper cron", output: "Competitive analysis doc" },
      "Brief": { description: "Creative brief: ICP × angle × format", agent: "Strategy", trigger: "Auto: research complete", output: "Creative brief doc" },
      "Copy": { description: "Write ad copy variants for testing", agent: "Copy", trigger: "Manual: Vlad approves brief", output: "3 copy variants (A/B/C)" },
      "Creative": { description: "Generate graphics from copy", agent: "Claude Code + Paper MCP", trigger: "Auto: copy complete", output: "Feed 1:1 + Stories 9:16" },
      "Review": { description: "Final approval + budget decision", agent: "Vlad only", trigger: "Auto: creative ready", output: "Approved set + budget" },
      "Live": { description: "Upload campaign to ad platform", agent: "Social + manual", trigger: "Manual: Vlad approval", output: "Campaign live + UTMs set" },
      "Optimizing": { description: "Monitor performance, kill or scale", agent: "Paid Ads", trigger: "Auto: 7 days of data", output: "Kill/scale report + Batch 2 briefs" },
    },
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
    stages: {
      "Prep": { description: "Gather assets, write listing copy", agent: "Copy + Strategy", trigger: "Manual: launch planned", output: "Launch asset bundle" },
      "Ready": { description: "All assets reviewed and staged", agent: "Vlad", trigger: "Auto: all assets complete", output: "Signed-off package" },
      "Submitted": { description: "Listing/post submitted to platform", agent: "Social", trigger: "Manual: Vlad approval", output: "Submission confirmation" },
      "Live": { description: "Launched — monitoring initial traction", agent: "Social + Strategy", trigger: "Auto: submission accepted", output: "Live link + Day 1 metrics" },
      "Follow-up": { description: "Engage comments, track results, iterate", agent: "Social", trigger: "Auto: 24h post-launch", output: "Launch retrospective" },
    },
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

// ─── Column colors ───────────────────────────────────────────────────────────

const COL_COLORS = [
  "var(--text-muted)",
  "var(--amber)",
  "#3B82F6",
  "var(--forest)",
  "var(--cranberry)",
  "#A855F7",
  "#EC4899",
];

const AGENT_COLORS: Record<string, string> = {
  "Strategy": "#BD632F",
  "Copy": "#A4243B",
  "Social": "#D8973C",
  "SEO/GEO": "#5C8A6C",
  "Paid Ads": "#6B8A9C",
  "Vlad": "#F5F4F2",
  "Vlad only": "#F5F4F2",
  "Founder": "#F5F4F2",
};

function getAgentColor(agent: string): string {
  for (const [key, color] of Object.entries(AGENT_COLORS)) {
    if (agent.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "var(--text-muted)";
}

// ─── Stage Info Component ────────────────────────────────────────────────────

function StageInfo({ meta, color }: { meta: StageMeta; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const agentColor = getAgentColor(meta.agent);

  return (
    <div style={{ padding: "0 10px", marginBottom: 6 }}>
      {/* Collapsed: description + agent badge */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
          {meta.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
            background: `${agentColor}18`, color: agentColor,
          }}>
            {meta.agent}
          </span>
          <span style={{
            fontSize: 10, color: "var(--text-muted)", opacity: 0.6,
          }}>
            {expanded ? "▾" : "▸"} info
          </span>
        </div>
      </div>

      {/* Expanded: trigger + output */}
      {expanded && (
        <div style={{
          marginTop: 6, padding: "8px 10px", borderRadius: 6,
          background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column", gap: 6,
          animation: "fadeIn 0.1s ease-out",
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Trigger</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{meta.trigger}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Output</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{meta.output}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [activePipeline, setActivePipeline] = useState(PIPELINES[0].id);
  const [editingCard, setEditingCard] = useState<PipelineCard | null>(null);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const allCards = (useQuery(api.pipelineCards.list, { pipelineId: activePipeline }) ?? []) as PipelineCard[];
  const createCard = useMutation(api.pipelineCards.create);
  const updateCardMut = useMutation(api.pipelineCards.update);
  const removeCard = useMutation(api.pipelineCards.remove);

  const { activeCampaignId, itemMatchesCampaign } = useCampaign();

  const pipeline = PIPELINES.find(p => p.id === activePipeline)!;
  const pipelineCards = allCards.filter(c => itemMatchesCampaign(c._id, activeCampaignId));

  async function addCard(column: string) {
    if (!newTitle.trim()) return;
    await createCard({ pipelineId: activePipeline, column, title: newTitle.trim() });
    setNewTitle("");
    setAddingCol(null);
  }

  async function updateCard(id: Id<"pipelineCards">, updates: { column?: string; title?: string; fields?: Record<string, string> }) {
    await updateCardMut({ id, ...updates });
  }

  async function deleteCard(id: Id<"pipelineCards">) {
    await removeCard({ id });
    setEditingCard(null);
  }

  async function moveCard(id: Id<"pipelineCards">, toCol: string) {
    await updateCardMut({ id, column: toCol });
  }

  function onDragStart(cardId: string) { setDragCard(cardId); }
  function onDragOver(e: React.DragEvent, col: string) { e.preventDefault(); setDragOverCol(col); }
  function onDragLeave() { setDragOverCol(null); }
  function onDrop(col: string) {
    if (dragCard) moveCard(dragCard as Id<"pipelineCards">, col);
    setDragCard(null);
    setDragOverCol(null);
  }

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
              {activePipeline === p.id && allCards.length > 0 && <span style={{ fontSize: 10, opacity: 0.6 }}>({allCards.length})</span>}
            </button>
          ))}
        </div>
      } />

      {/* Pipeline columns */}
      <div style={{
        flex: 1, display: "flex", gap: 12, padding: "16px 20px",
        overflowX: "auto", overflowY: "hidden",
      }}>
        {pipeline.columns.map((col, colIdx) => {
          const colCards = pipelineCards.filter(c => c.column === col);
          const colColor = COL_COLORS[colIdx % COL_COLORS.length];
          const isDropTarget = dragOverCol === col;
          const stageMeta = pipeline.stages[col];

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
                padding: "8px 10px 4px",
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

              {/* Stage meta */}
              {stageMeta && <StageInfo meta={stageMeta} color={colColor} />}

              {/* Cards */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, padding: "4px 0", paddingBottom: 60 }}>
                {addingCol === col && (
                  <div style={{
                    padding: "10px", margin: "0 4px", borderRadius: 8,
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
                      padding: "10px 12px", margin: "0 4px", borderRadius: 8,
                      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                      cursor: "grab", transition: "border-color 0.15s",
                      opacity: dragCard === card.id ? 0.4 : 1,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>{card.title}</div>
                    <div style={{ marginBottom: 4 }}><CampaignTag itemId={card.id} /></div>
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

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stage</div>
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

      {pipelineCards.length === 0 && !addingCol && (
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          textAlign: "center", color: "var(--text-muted)", fontSize: 13,
          pointerEvents: "none",
        }}>
          No cards yet — click + on any column to get started
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
