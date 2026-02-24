"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Nav } from "@/app/components/Nav";
import { Id } from "@/convex/_generated/dataModel";

type Category = "analytics" | "marketing" | "seo" | "email" | "social" | "dev" | "design" | "ai" | "other";
type Status = "active" | "trial" | "needs-setup" | "cancelled";
type BillingCycle = "monthly" | "annual" | "free" | "one-time";

const STATUS_COLORS: Record<Status, string> = {
  "active": "#5C8A6C",
  "trial": "#D8973C",
  "needs-setup": "#6B8A9C",
  "cancelled": "#6B6A68",
};

const STATUS_LABELS: Record<Status, string> = {
  "active": "Active",
  "trial": "Trial",
  "needs-setup": "Needs Setup",
  "cancelled": "Cancelled",
};

const CATEGORY_LABELS: Record<Category, string> = {
  analytics: "Analytics", marketing: "Marketing", seo: "SEO",
  email: "Email", social: "Social", dev: "Dev", design: "Design",
  ai: "AI", other: "Other",
};

const CATEGORIES: Category[] = ["analytics", "marketing", "seo", "email", "social", "dev", "design", "ai", "other"];
const STATUSES: Status[] = ["active", "trial", "needs-setup", "cancelled"];

type Tool = {
  _id: Id<"tools">;
  name: string;
  category: Category;
  status: Status;
  url?: string;
  cost?: string;
  billingCycle?: BillingCycle;
  accessNotes?: string;
  notes?: string;
  addedAt: number;
  updatedAt: number;
};

function ToolModal({ tool, onClose }: { tool?: Tool; onClose: () => void }) {
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);

  const [name, setName] = useState(tool?.name ?? "");
  const [category, setCategory] = useState<Category>(tool?.category ?? "other");
  const [status, setStatus] = useState<Status>(tool?.status ?? "active");
  const [url, setUrl] = useState(tool?.url ?? "");
  const [cost, setCost] = useState(tool?.cost ?? "");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(tool?.billingCycle ?? "monthly");
  const [accessNotes, setAccessNotes] = useState(tool?.accessNotes ?? "");
  const [notes, setNotes] = useState(tool?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
    borderRadius: "6px", padding: "7px 10px", color: "var(--text-primary)",
    fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const,
  };

  const labelStyle = { fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", display: "block" as const };

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (tool) {
        await update({ id: tool._id, name, category, status, url: url || undefined, cost: cost || undefined, billingCycle, accessNotes: accessNotes || undefined, notes: notes || undefined });
      } else {
        await create({ name, category, status, url: url || undefined, cost: cost || undefined, billingCycle, accessNotes: accessNotes || undefined, notes: notes || undefined });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!tool) return;
    if (!confirm(`Delete "${tool.name}"?`)) return;
    await remove({ id: tool._id });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px", padding: "24px", width: "480px", maxWidth: "95vw" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" }}>
          {tool ? "Edit tool" : "Add tool"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PostHog" autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value as Category)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as Status)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Cost</label>
              <input style={inputStyle} value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. $29/mo or free" />
            </div>
            <div>
              <label style={labelStyle}>Billing</label>
              <select style={inputStyle} value={billingCycle} onChange={e => setBillingCycle(e.target.value as BillingCycle)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="free">Free</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>URL</label>
            <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label style={labelStyle}>Access / credentials</label>
            <input style={inputStyle} value={accessNotes} onChange={e => setAccessNotes(e.target.value)} placeholder="e.g. Vlad's Google account, 1Password vault" />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          {tool ? (
            <button onClick={handleDelete} style={{ background: "none", border: "1px solid #A4243B44", borderRadius: "6px", padding: "6px 12px", color: "#A4243B", fontSize: "12px", cursor: "pointer" }}>
              Delete
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "6px 14px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "6px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StackPage() {
  const tools = (useQuery(api.tools.list) ?? []) as Tool[];
  const [editing, setEditing] = useState<Tool | null | "new">(null);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");

  const filtered = tools.filter(t =>
    (filterStatus === "all" || t.status === filterStatus) &&
    (filterCategory === "all" || t.category === filterCategory)
  );

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<Category, Tool[]>);

  const totalMonthlyCost = tools
    .filter(t => t.status === "active" && t.cost && t.billingCycle === "monthly")
    .reduce((sum, t) => {
      const num = parseFloat(t.cost?.replace(/[^0-9.]/g, "") ?? "0");
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)" }}>
      {/* Header */}
      <Nav active="/stack" right={<>
        {totalMonthlyCost > 0 && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)", padding: "4px 10px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
            ${totalMonthlyCost.toFixed(0)}/mo active
          </span>
        )}
        <button onClick={() => setEditing("new")} style={{ background: "var(--text-primary)", border: "none", borderRadius: "7px", padding: "6px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          + Add tool
        </button>
      </>} />

      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
              background: filterStatus === s ? `${STATUS_COLORS[s]}22` : "var(--bg-card)",
              border: `1px solid ${filterStatus === s ? STATUS_COLORS[s] : "var(--border-subtle)"}`,
              color: filterStatus === s ? STATUS_COLORS[s] : "var(--text-muted)",
              fontWeight: filterStatus === s ? 600 : 400,
            }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
          <span style={{ color: "var(--border-default)" }}>|</span>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCategory(filterCategory === c ? "all" : c)} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
              background: filterCategory === c ? "var(--bg-card-elevated)" : "var(--bg-card)",
              border: `1px solid ${filterCategory === c ? "var(--border-default)" : "var(--border-subtle)"}`,
              color: filterCategory === c ? "var(--text-primary)" : "var(--text-muted)",
            }}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {tools.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔧</div>
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>No tools yet</div>
            <div style={{ fontSize: "12px" }}>Add your first tool, subscription, or service</div>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                {CATEGORY_LABELS[cat as Category]}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
                {items.map(tool => (
                  <div key={tool._id} onClick={() => setEditing(tool)} style={{
                    background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px",
                    padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{tool.name}</div>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
                        background: `${STATUS_COLORS[tool.status]}18`,
                        color: STATUS_COLORS[tool.status],
                        border: `1px solid ${STATUS_COLORS[tool.status]}33`,
                        flexShrink: 0, marginLeft: "8px",
                      }}>
                        {STATUS_LABELS[tool.status]}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {tool.cost && <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{tool.cost}</span>}
                      {tool.billingCycle && tool.billingCycle !== "free" && tool.cost && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>· {tool.billingCycle}</span>
                      )}
                      {tool.url && (
                        <a href={tool.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>
                          ↗
                        </a>
                      )}
                    </div>
                    {tool.accessNotes && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", borderTop: "1px solid var(--border-subtle)", paddingTop: "6px" }}>
                        🔑 {tool.accessNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ToolModal
          tool={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
