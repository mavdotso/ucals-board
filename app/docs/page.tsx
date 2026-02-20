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
  const [openId, setOpenId] = useState<Id<"docs"> | null>(null);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [search, setSearch] = useState("");
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

  const filtered = docs.filter(d => {
    if (filterAgent && d.agent !== filterAgent) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function createDoc() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const id = await upsert({ path: `vlad/${date}-${slug}.md`, title: newTitle, content: `# ${newTitle}\n\n`, agent: "vlad", board });
    setOpenId(id as Id<"docs">);
    setNewTitle("");
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

  // ── OPEN DOC VIEW ──────────────────────────────────────────────────
  if (openId && openDoc) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
        {/* Doc toolbar */}
        <header style={{
          borderBottom: "1px solid var(--border-subtle)", padding: "0 24px",
          height: "52px", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0, gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setOpenId(null)} style={{
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
              fontSize: "18px", lineHeight: 1, padding: "0 4px",
            }}>←</button>
            <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <span onClick={() => setOpenId(null)} style={{ fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}>docs</span>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {openDoc.title}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {saveStatus !== "saved" && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {saveStatus === "saving" ? "Saving…" : "●"}
              </span>
            )}
            <button onClick={() => setEditing(e => !e)} style={{
              background: editing ? "var(--bg-card-elevated)" : "none",
              border: `1px solid ${editing ? "var(--border-default)" : "var(--border-subtle)"}`,
              borderRadius: "6px", padding: "4px 14px", fontSize: "12px",
              color: editing ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
            }}>{editing ? "Preview" : "Edit"}</button>
            <button onClick={async () => {
              if (confirm(`Delete "${openDoc.title}"?`)) {
                await remove({ id: openDoc._id });
                setOpenId(null);
              }
            }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>
              Delete
            </button>
          </div>
        </header>

        {/* Doc content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {editing ? (
            <RichEditor content={openDoc.content} onChange={handleChange} placeholder="Start writing…" />
          ) : (
            <div style={{ padding: "48px 64px", maxWidth: "860px", margin: "0 auto" }}>
              {/* Title */}
              <div style={{ marginBottom: "32px" }}>
                {editingTitle ? (
                  <input autoFocus defaultValue={openDoc.title}
                    onBlur={e => handleTitleSave(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value);
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
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

        <style>{`
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
        `}</style>
      </div>
    );
  }

  // ── DOCS LIST VIEW ─────────────────────────────────────────────────
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
            <button key={b} onClick={() => { setBoard(b); }} style={{
              background: board === b ? "var(--bg-card-elevated)" : "none",
              border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: board === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "180px" }}
          />
          <div style={{ display: "flex", gap: "4px" }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createDoc(); }}
              placeholder="New document…"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "180px" }}
            />
            <button onClick={createDoc} disabled={!newTitle.trim() || creating} style={{
              background: "var(--text-primary)", border: "none", borderRadius: "6px",
              padding: "5px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
              cursor: newTitle.trim() ? "pointer" : "not-allowed", opacity: newTitle.trim() ? 1 : 0.4,
            }}>+ New</button>
          </div>
        </div>
      </header>

      {/* Agent filter bar */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "6px", background: "var(--bg-secondary)", flexWrap: "wrap" }}>
        <button onClick={() => setFilterAgent(null)} style={{
          background: filterAgent === null ? "var(--bg-card-elevated)" : "none",
          border: filterAgent === null ? "1px solid var(--border-default)" : "1px solid transparent",
          borderRadius: "6px", padding: "3px 12px", fontSize: "12px",
          color: filterAgent === null ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
        }}>All · {docs.length}</button>
        {AGENTS.filter(a => docs.some(d => d.agent === a)).map(a => {
          const count = docs.filter(d => d.agent === a).length;
          return (
            <button key={a} onClick={() => setFilterAgent(filterAgent === a ? null : a)} style={{
              background: filterAgent === a ? `${AGENT_COLORS[a]}20` : "none",
              border: filterAgent === a ? `1px solid ${AGENT_COLORS[a]}55` : "1px solid transparent",
              borderRadius: "6px", padding: "3px 12px", fontSize: "12px",
              color: filterAgent === a ? AGENT_COLORS[a] : "var(--text-muted)", cursor: "pointer", textTransform: "capitalize",
            }}>{a} · {count}</button>
          );
        })}
      </div>

      {/* Docs grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>📄</div>
            <div style={{ fontSize: "14px" }}>{docs.length === 0 ? "No documents yet" : "No results"}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
            {filtered.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
              const color = AGENT_COLORS[doc.agent ?? ""] ?? "var(--text-muted)";
              return (
                <div key={doc._id} onClick={() => setOpenId(doc._id)}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                    borderRadius: "10px", padding: "16px", cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-card-elevated)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "8px" }}>
                    {doc.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {doc.agent && (
                      <span style={{ fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {doc.agent}
                      </span>
                    )}
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>
                      {formatDate(doc.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
