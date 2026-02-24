"use client";
import { useState, useEffect } from "react";
import { Nav } from "@/app/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

type AccountStatus = "active" | "not-set-up" | "blocked" | "deleted";
type AccountCategory = "social" | "marketing" | "advertising" | "app-stores" | "dev" | "other";

interface Account {
  id: string;
  name: string;
  handle?: string;
  url?: string;
  status: AccountStatus;
  category: AccountCategory;
  owner?: string;
  notes?: string;
  icon: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#5C8A6C", bg: "rgba(92,138,108,0.12)" },
  "not-set-up": { label: "Not set up", color: "#6B6A68", bg: "rgba(107,106,104,0.12)" },
  blocked: { label: "Blocked", color: "#A4243B", bg: "rgba(164,36,59,0.12)" },
  deleted: { label: "Deleted", color: "#6B6A68", bg: "rgba(107,106,104,0.08)" },
};

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  social: "Social Accounts",
  marketing: "Marketing & Analytics",
  advertising: "Advertising",
  "app-stores": "App Stores",
  dev: "Dev & Infrastructure",
  other: "Other",
};

const CATEGORY_ORDER: AccountCategory[] = ["social", "marketing", "advertising", "app-stores", "dev", "other"];

const STORAGE_KEY = "ucals-accounts";

// ─── Default Data ────────────────────────────────────────────────────────────

const DEFAULT_ACCOUNTS: Account[] = [
  // Social
  { id: "x", name: "X (Twitter)", handle: "@ucalsapp", url: "https://x.com/ucalsapp", status: "active", category: "social", owner: "Vlad", icon: "𝕏" },
  { id: "linkedin", name: "LinkedIn", handle: "TBD", status: "not-set-up", category: "social", owner: "Vlad", icon: "in" },
  { id: "reddit", name: "Reddit", handle: "Vlad personal", url: "https://reddit.com", status: "active", category: "social", owner: "Vlad", icon: "🔴" },
  { id: "producthunt", name: "Product Hunt", handle: "TBD", url: "https://producthunt.com", status: "not-set-up", category: "social", owner: "Vlad", icon: "🐱" },

  // Marketing & Analytics
  { id: "foreplay", name: "Foreplay.co", url: "https://foreplay.co", status: "active", category: "marketing", owner: "mavdotso@gmail.com", icon: "▶️" },
  { id: "loops", name: "Loops.so", url: "https://loops.so", status: "not-set-up", category: "marketing", notes: "Email marketing & newsletters", icon: "🔄" },
  { id: "typefully", name: "Typefully", url: "https://typefully.com", status: "not-set-up", category: "marketing", notes: "Twitter/X scheduling", icon: "✍️" },
  { id: "ga4", name: "GA4 / GTM", url: "https://analytics.google.com", status: "not-set-up", category: "marketing", notes: "Google Analytics 4 + Tag Manager", icon: "📊" },
  { id: "gsc", name: "Google Search Console", url: "https://search.google.com/search-console", status: "not-set-up", category: "marketing", notes: "Submit sitemap, monitor indexing", icon: "🔍" },
  { id: "semrush", name: "Semrush", url: "https://semrush.com", status: "not-set-up", category: "marketing", notes: "SEO & keyword research", icon: "📈" },
  { id: "posthog", name: "PostHog", url: "https://posthog.com", status: "deleted", category: "marketing", notes: "Previously used, now deleted", icon: "🦔" },

  // Advertising
  { id: "meta-ads", name: "Meta Ads", url: "https://business.facebook.com", status: "not-set-up", category: "advertising", notes: "Facebook + Instagram ads", icon: "Ⓜ️" },
  { id: "google-ads", name: "Google Ads", url: "https://ads.google.com", status: "not-set-up", category: "advertising", notes: "Search + Display campaigns", icon: "🅶" },

  // App Stores
  { id: "apple-appstore", name: "Apple App Store", url: "https://appstoreconnect.apple.com", status: "not-set-up", category: "app-stores", notes: "Requires Apple Developer account ($99/yr)", icon: "🍎" },
];

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadAccounts(): Account[] {
  if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Account[];
      // Merge: keep saved data, add any new defaults
      const savedIds = new Set(saved.map(a => a.id));
      return [...saved, ...DEFAULT_ACCOUNTS.filter(a => !savedIds.has(a.id))];
    }
    return DEFAULT_ACCOUNTS;
  } catch { return DEFAULT_ACCOUNTS; }
}

function saveAccounts(accounts: Account[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccountStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AccountCategory>("other");

  useEffect(() => { setAccounts(loadAccounts()); }, []);
  useEffect(() => { if (accounts.length) saveAccounts(accounts); }, [accounts]);

  const filtered = filter === "all" ? accounts : accounts.filter(a => a.status === filter);
  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(a => a.category === cat) }))
    .filter(g => g.items.length > 0);

  function updateAccount(id: string, updates: Partial<Account>) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }

  function addAccount() {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setAccounts(prev => [...prev, {
      id, name: newName.trim(), status: "not-set-up", category: newCategory, icon: "🔗",
    }]);
    setNewName("");
    setAdding(false);
  }

  function removeAccount(id: string) {
    if (!confirm("Remove this account?")) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (editingId === id) setEditingId(null);
  }

  // Status counts
  const counts = {
    all: accounts.length,
    active: accounts.filter(a => a.status === "active").length,
    "not-set-up": accounts.filter(a => a.status === "not-set-up").length,
    blocked: accounts.filter(a => a.status === "blocked").length,
    deleted: accounts.filter(a => a.status === "deleted").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/stack" right={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Filters */}
          {(["all", "active", "not-set-up", "blocked"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              background: filter === f ? "var(--bg-card-elevated)" : "transparent",
              border: filter === f ? "1px solid var(--border-default)" : "1px solid transparent",
              color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: filter === f ? 600 : 400,
            }}>
              {f === "all" ? "All" : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />

          <button onClick={() => setAdding(!adding)} style={{
            background: "var(--text-primary)", border: "none", borderRadius: 6,
            padding: "4px 12px", color: "var(--bg-app)", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>+ Account</button>
        </div>
      } />

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
        {/* Summary bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          {(["active", "not-set-up", "blocked", "deleted"] as AccountStatus[]).map(s => (
            <div key={s} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 8,
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              flex: 1,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: STATUS_CONFIG[s].color,
              }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{counts[s]}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{STATUS_CONFIG[s].label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {adding && (
          <div style={{
            display: "flex", gap: 8, alignItems: "center", marginBottom: 20,
            padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-default)",
            borderRadius: 8,
          }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Account name…"
              onKeyDown={e => e.key === "Enter" && addAccount()} autoFocus
              style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as AccountCategory)}
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
              {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <button onClick={addAccount} disabled={!newName.trim()} style={{
              background: "var(--text-primary)", border: "none", borderRadius: 6,
              padding: "6px 14px", color: "var(--bg-app)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              opacity: newName.trim() ? 1 : 0.4,
            }}>Add</button>
            <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          </div>
        )}

        {/* Grouped list */}
        {grouped.map(({ cat, items }) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              {CATEGORY_LABELS[cat]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(account => {
                const cfg = STATUS_CONFIG[account.status];
                const isEditing = editingId === account.id;

                if (isEditing) {
                  return (
                    <div key={account.id} style={{
                      padding: "14px 16px", borderRadius: 8,
                      background: "var(--bg-card)", border: "1px solid var(--border-default)",
                      display: "flex", flexDirection: "column", gap: 10,
                    }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={account.name} onChange={e => updateAccount(account.id, { name: e.target.value })}
                          style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                        <select value={account.status} onChange={e => updateAccount(account.id, { status: e.target.value as AccountStatus })}
                          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 12, outline: "none" }}>
                          <option value="active">Active</option>
                          <option value="not-set-up">Not set up</option>
                          <option value="blocked">Blocked</option>
                          <option value="deleted">Deleted</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={account.handle || ""} onChange={e => updateAccount(account.id, { handle: e.target.value })} placeholder="Handle…"
                          style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                        <input value={account.url || ""} onChange={e => updateAccount(account.id, { url: e.target.value })} placeholder="URL…"
                          style={{ flex: 2, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={account.owner || ""} onChange={e => updateAccount(account.id, { owner: e.target.value })} placeholder="Owner…"
                          style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                        <input value={account.notes || ""} onChange={e => updateAccount(account.id, { notes: e.target.value })} placeholder="Notes…"
                          style={{ flex: 2, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "5px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => removeAccount(account.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>Delete</button>
                        <button onClick={() => setEditingId(null)} style={{
                          background: "var(--text-primary)", border: "none", borderRadius: 6,
                          padding: "5px 14px", color: "var(--bg-app)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>Done</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={account.id}
                    onClick={() => setEditingId(account.id)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                    style={{
                      padding: "12px 16px", borderRadius: 8,
                      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                      cursor: "pointer", transition: "border-color 0.15s",
                      display: "flex", alignItems: "center", gap: 12,
                      opacity: account.status === "deleted" ? 0.5 : 1,
                    }}>
                    {/* Icon */}
                    <span style={{ fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 }}>{account.icon}</span>

                    {/* Name + handle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{account.name}</span>
                        {account.handle && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{account.handle}</span>}
                      </div>
                      {account.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{account.notes}</div>}
                    </div>

                    {/* Owner */}
                    {account.owner && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{account.owner}</span>
                    )}

                    {/* Status badge */}
                    <span style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 12,
                      background: cfg.bg, fontSize: 11, fontWeight: 500,
                      color: cfg.color, flexShrink: 0,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />
                      {cfg.label}
                    </span>

                    {/* Link */}
                    {account.url && (
                      <a href={account.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", flexShrink: 0 }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
                      >↗</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: 60, fontSize: 13 }}>
            No accounts match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
