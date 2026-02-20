"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RichEditor } from "@/app/components/editor/RichEditor";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { marked } from "marked";

type Board = "marketing" | "product";

const AGENT_COLORS: Record<string, string> = {
  aria: "#BD632F", maya: "#A4243B", leo: "#D8973C",
  sage: "#5C8A6C", rex: "#6B8A9C", anya: "#8B7CF6", vlad: "#A5A4A0",
};
const AGENTS = ["aria", "maya", "leo", "sage", "rex", "anya", "vlad"];

const CATEGORIES = [
  { id: "Copy",     icon: "📣", label: "Copy",     desc: "Landing pages, emails, CTAs, onboarding" },
  { id: "SEO",      icon: "🔍", label: "SEO",      desc: "Articles, keywords, backlinks, optimization" },
  { id: "Social",   icon: "📱", label: "Social",   desc: "Twitter, LinkedIn, build-in-public" },
  { id: "Launch",   icon: "🚀", label: "Launch",   desc: "Product Hunt, press, media kit" },
  { id: "Strategy", icon: "📊", label: "Strategy", desc: "Competitive, positioning, revenue model" },
  { id: "Product",  icon: "🛠", label: "Product",  desc: "In-app copy, A/B tests, app store" },
  { id: "Ops",      icon: "📁", label: "Ops",      desc: "Checklists, roadmaps, action items" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

function getCategory(title: string, path: string): CategoryId {
  const t = title.toLowerCase();
  if (
    t.includes("landing page") || t.includes("email") || t.includes("onboarding") ||
    t.includes("pricing page") || t.includes("cancellation flow") || t.includes("referral") ||
    t.includes("about page") || t.includes("trial") || t.includes("win-back") ||
    t.includes("waitlist") || t.includes("cta") || t.includes("copy rewrite") ||
    t.includes("churn reduction") || t.includes("founder variant") || t.includes("merged v")
  ) return "Copy";
  if (
    t.includes("seo") || t.includes("backlink") || t.includes("article") ||
    t.includes("alternative") || t.includes("calendar app") || t.includes("ai calendar") ||
    t.includes("time blocking") || t.includes("comparison") || t.includes("organic") ||
    t.includes("keyword") || t.includes("publishing cadence") || t.includes("llms") ||
    t.includes("save 5 hours") || t.includes("productivity") || t.includes("adhd") ||
    t.includes("organize") || t.includes("best calendar") || t.includes("semantic")
  ) return "SEO";
  if (
    t.includes("twitter") || t.includes("linkedin") || t.includes("social") ||
    t.includes("build in public") || t.includes("community") || t.includes("indie hackers") ||
    t.includes("tweet") || t.includes("reddit") || t.includes("monitoring playbook")
  ) return "Social";
  if (
    t.includes("product hunt") || t.includes("press") || t.includes("media kit") ||
    t.includes("launch post") || t.includes("launch strategy") || t.includes("launch checklist") ||
    t.includes("launch day") || t.includes("debrief")
  ) return "Launch";
  if (
    t.includes("persona") || t.includes("competitive") || t.includes("positioning") ||
    t.includes("revenue model") || t.includes("cac") || t.includes("ltv") ||
    t.includes("youtube ads") || t.includes("pricing strategy") || t.includes("icp") ||
    t.includes("twelve-month") || t.includes("twelve month") || t.includes("market") ||
    t.includes("landing page a/b") || t.includes("ab test plan") || t.includes("activation")
  ) return "Strategy";
  if (
    t.includes("cheat sheet") || t.includes("in-app") || t.includes("app store") ||
    t.includes("cancellation flow") || t.includes("website implementation") ||
    t.includes("natural language") || t.includes("feature") || t.includes("ui copy") ||
    t.includes("notification")
  ) return "Product";
  return "Ops";
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MarkdownView({ content }: { content: string }) {
  const html = marked.parse(content, { async: false }) as string;
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const [board, setBoard] = useState<Board>("marketing");
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [openId, setOpenId] = useState<Id<"docs"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editingTitle, setEditingTitle] = useState(false);
  const [search, setSearch] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setOpenId(id as Id<"docs">);
  }, [searchParams]);

  useEffect(() => { setEditing(false); setEditingTitle(false); }, [openId]);

  const docs = useQuery(api.docs.list, { board }) ?? [];
  const openDoc = useQuery(api.docs.get, openId ? { id: openId } : "skip");
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  const isSearching = search.length > 0;
  const searchResults = isSearching
    ? docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    : [];

  const docsWithCategory = docs.map(d => ({ ...d, category: getCategory(d.title, d.path) }));
  const visibleDocs = activeCategory
    ? docsWithCategory.filter(d => d.category === activeCategory)
    : docsWithCategory;

  async function createDoc() {
    if (!newDocTitle.trim()) return;
    setCreating(true);
    const slug = newDocTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const path = `vlad/${date}-${slug}.md`;
    const id = await upsert({ path, title: newDocTitle, content: `# ${newDocTitle}\n\n`, agent: "vlad", board });
    setOpenId(id as Id<"docs">);
    setNewDocTitle("");
    setCreating(false);
    setEditing(true);
  }

  async function handleChange(content: string) {
    if (!openId) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      await save({ id: openId, content });
      setSaveStatus("saved");
    }, 1000);
  }

  async function handleTitleSave(title: string) {
    if (!openId || !title.trim()) return;
    setEditingTitle(false);
    await save({ id: openId, title });
  }

  const agentColor = openDoc?.agent ? (AGENT_COLORS[openDoc.agent] ?? "var(--text-muted)") : "var(--text-muted)";

  const MARKDOWN_STYLES = `
    .markdown-body { color: var(--text-secondary); font-size: 15px; line-height: 1.8; }
    .markdown-body h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 18px; color: var(--text-primary); }
    .markdown-body h2 { font-size: 1.3em; font-weight: 600; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
    .markdown-body h3 { font-size: 1.1em; font-weight: 600; margin: 28px 0 8px; color: var(--text-primary); }
    .markdown-body h4 { font-size: 1em; font-weight: 600; margin: 20px 0 6px; color: var(--text-primary); }
    .markdown-body p { margin: 0 0 16px; }
    .markdown-body ul, .markdown-body ol { margin: 0 0 16px; padding-left: 24px; }
    .markdown-body li { margin-bottom: 6px; }
    .markdown-body li > ul, .markdown-body li > ol { margin-top: 4px; margin-bottom: 0; }
    .markdown-body code { background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; color: var(--text-primary); }
    .markdown-body pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 18px; overflow-x: auto; margin: 0 0 18px; }
    .markdown-body pre code { background: none; border: none; padding: 0; font-size: 13px; line-height: 1.6; }
    .markdown-body blockquote { border-left: 3px solid var(--border-default); margin: 0 0 16px; padding: 4px 18px; color: var(--text-muted); }
    .markdown-body table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 13px; }
    .markdown-body th { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 9px 14px; text-align: left; font-weight: 600; color: var(--text-primary); }
    .markdown-body td { border: 1px solid var(--border-subtle); padding: 9px 14px; }
    .markdown-body tr:nth-child(even) td { background: var(--bg-card); }
    .markdown-body a { color: var(--text-primary); text-decoration: underline; }
    .markdown-body hr { border: none; border-top: 1px solid var(--border-subtle); margin: 28px 0; }
    .markdown-body strong { color: var(--text-primary); font-weight: 600; }
  `;

  // ── OPEN DOC VIEW ──────────────────────────────────────────────────
  if (openId && openDoc) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
        <header style={{
          borderBottom: "1px solid var(--border-subtle)", padding: "0 24px",
          height: "52px", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0, gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setOpenId(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px" }}>←</button>
            <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <span onClick={() => setOpenId(null)} style={{ fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}>docs</span>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {openDoc.title}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {saveStatus !== "saved" && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{saveStatus === "saving" ? "Saving…" : "●"}</span>
            )}
            <button onClick={() => setEditing(e => !e)} style={{
              background: editing ? "var(--bg-card-elevated)" : "none",
              border: `1px solid ${editing ? "var(--border-default)" : "var(--border-subtle)"}`,
              borderRadius: "6px", padding: "4px 14px", fontSize: "12px",
              color: editing ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
            }}>{editing ? "Preview" : "Edit"}</button>
            <button onClick={async () => {
              if (confirm(`Delete "${openDoc.title}"?`)) { await remove({ id: openDoc._id }); setOpenId(null); }
            }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>Delete</button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {editing ? (
            <RichEditor content={openDoc.content} onChange={handleChange} placeholder="Start writing…" />
          ) : (
            <div style={{ padding: "48px 64px", maxWidth: "860px", margin: "0 auto" }}>
              <div style={{ marginBottom: "32px" }}>
                {editingTitle ? (
                  <input autoFocus defaultValue={openDoc.title}
                    onBlur={e => handleTitleSave(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingTitle(false); }}
                    style={{ fontSize: "32px", fontWeight: 700, background: "none", border: "none", borderBottom: "1px solid var(--border-default)", color: "var(--text-primary)", outline: "none", width: "100%", padding: "0" }}
                  />
                ) : (
                  <h1 onClick={() => setEditingTitle(true)} style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)", margin: 0, cursor: "text", lineHeight: 1.2 }}>
                    {openDoc.title}
                  </h1>
                )}
                <div style={{ display: "flex", gap: "14px", marginTop: "10px", alignItems: "center" }}>
                  {openDoc.agent && <span style={{ fontSize: "12px", fontWeight: 600, color: agentColor, textTransform: "capitalize" }}>{openDoc.agent}</span>}
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(openDoc.updatedAt)}</span>
                </div>
              </div>
              <MarkdownView content={openDoc.content} />
            </div>
          )}
        </div>
        <style>{MARKDOWN_STYLES}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)", padding: "0 24px",
        height: "52px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0, gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/stack" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>stack</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>docs</span>
          <span style={{ color: "var(--border-default)" }}>/</span>
          {(["marketing", "product"] as Board[]).map(b => (
            <button key={b} onClick={() => { setBoard(b); setActiveCategory(null); }} style={{
              background: board === b ? "var(--bg-card-elevated)" : "none",
              border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: board === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setActiveCategory(null); }} placeholder="Search docs…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "180px" }}
          />
          <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createDoc(); }}
            placeholder="New document…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "170px" }}
          />
          <button onClick={createDoc} disabled={!newDocTitle.trim() || creating} style={{
            background: "var(--text-primary)", border: "none", borderRadius: "6px",
            padding: "5px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
            cursor: newDocTitle.trim() ? "pointer" : "not-allowed", opacity: newDocTitle.trim() ? 1 : 0.4,
          }}>+ New</button>
        </div>
      </header>

      {/* Category filter bar */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <button onClick={() => { setActiveCategory(null); setSearch(""); }} style={{
          background: activeCategory === null && !isSearching ? "var(--bg-card-elevated)" : "none",
          border: activeCategory === null && !isSearching ? "1px solid var(--border-default)" : "1px solid transparent",
          borderRadius: "6px", padding: "3px 12px", fontSize: "12px",
          color: activeCategory === null && !isSearching ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
        }}>All · {docs.length}</button>
        {CATEGORIES.map(cat => {
          const count = docsWithCategory.filter(d => d.category === cat.id).length;
          const isActive = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => { setActiveCategory(isActive ? null : cat.id); setSearch(""); }} style={{
              background: isActive ? "var(--bg-card-elevated)" : "none",
              border: isActive ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 12px", fontSize: "12px",
              color: isActive ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={{ opacity: 0.6 }}>· {count}</span>
            </button>
          );
        })}
        {isSearching && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: "6px" }}>✕</button>
          </span>
        )}
      </div>

      {/* Doc grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {(() => {
          const displayDocs = isSearching ? searchResults : visibleDocs;
          if (displayDocs.length === 0) {
            return (
              <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📄</div>
                <div style={{ fontSize: "14px" }}>{docs.length === 0 ? "No documents yet" : "No results"}</div>
              </div>
            );
          }

          // If showing all (no filter, no search) → show category sections
          if (!isSearching && !activeCategory) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {CATEGORIES.map(cat => {
                  const catDocs = docsWithCategory.filter(d => d.category === cat.id);
                  if (catDocs.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{cat.label}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {catDocs.length}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "8px" }}>
                        {catDocs.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
                          const agColor = AGENT_COLORS[doc.agent ?? ""] ?? "var(--text-muted)";
                          return (
                            <div key={doc._id} onClick={() => setOpenId(doc._id)}
                              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "14px", cursor: "pointer", transition: "border-color 0.12s, background 0.12s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-card-elevated)"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                            >
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "6px" }}>{doc.title}</div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: agColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{doc.agent}</span>
                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Filtered view (single category or search)
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "8px" }}>
              {displayDocs.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
                const agColor = AGENT_COLORS[doc.agent ?? ""] ?? "var(--text-muted)";
                return (
                  <div key={doc._id} onClick={() => setOpenId(doc._id)}
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "14px", cursor: "pointer", transition: "border-color 0.12s, background 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-card-elevated)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "6px" }}>{doc.title}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: agColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{doc.agent}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <style>{MARKDOWN_STYLES}</style>
    </div>
  );
}
