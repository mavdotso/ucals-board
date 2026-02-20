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
  return (
    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const [board, setBoard] = useState<Board>("marketing");
  const [selectedId, setSelectedId] = useState<Id<"docs"> | null>(null);
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
    if (id) setSelectedId(id as Id<"docs">);
  }, [searchParams]);

  useEffect(() => { setEditing(false); }, [selectedId]);

  const docs = useQuery(api.docs.list, { board }) ?? [];
  const selectedDoc = useQuery(api.docs.get, selectedId ? { id: selectedId } : "skip");
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  // Filter + group by agent
  const filtered = docs.filter(d => {
    if (filterAgent && d.agent !== filterAgent) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by agent
  const grouped = AGENTS.reduce((acc, agent) => {
    const agentDocs = filtered.filter(d => d.agent === agent);
    if (agentDocs.length) acc[agent] = agentDocs;
    return acc;
  }, {} as Record<string, typeof docs>);

  // Ungrouped docs (no agent or unknown agent)
  const ungrouped = filtered.filter(d => !d.agent || !AGENTS.includes(d.agent));

  async function createDoc() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const path = `vlad/${date}-${slug}.md`;
    const id = await upsert({ path, title: newTitle, content: `# ${newTitle}\n\n`, agent: "vlad", board });
    setSelectedId(id as Id<"docs">);
    setNewTitle("");
    setCreating(false);
    setEditing(true);
  }

  async function handleChange(content: string) {
    if (!selectedId) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      await save({ id: selectedId, content });
      setSaveStatus("saved");
    }, 1000);
  }

  async function handleTitleSave(title: string) {
    if (!selectedId || !title.trim()) return;
    setEditingTitle(false);
    await save({ id: selectedId, title });
  }

  const agentColor = selectedDoc?.agent ? (AGENT_COLORS[selectedDoc.agent] ?? "var(--text-muted)") : "var(--text-muted)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)", padding: "0 20px",
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
            <button key={b} onClick={() => { setBoard(b); setSelectedId(null); }} style={{
              background: board === b ? "var(--bg-card-elevated)" : "none",
              border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: board === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedDoc && saveStatus !== "saved" && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {saveStatus === "saving" ? "Saving…" : "●"}
            </span>
          )}
          {selectedDoc && (
            <button onClick={() => setEditing(e => !e)} style={{
              background: editing ? "var(--bg-card-elevated)" : "none",
              border: `1px solid ${editing ? "var(--border-default)" : "var(--border-subtle)"}`,
              borderRadius: "6px", padding: "4px 12px", fontSize: "12px",
              color: editing ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
            }}>{editing ? "Preview" : "Edit"}</button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sidebar — doc list */}
        <div style={{
          width: "280px", minWidth: "280px", borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Search + new doc */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search docs…"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "6px", padding: "5px 9px", color: "var(--text-primary)", fontSize: "12px", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createDoc(); }}
                placeholder="New document…"
                style={{
                  flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  borderRadius: "6px", padding: "5px 9px", color: "var(--text-primary)", fontSize: "12px", outline: "none",
                }}
              />
              <button onClick={createDoc} disabled={!newTitle.trim() || creating} style={{
                background: "var(--text-primary)", border: "none", borderRadius: "6px",
                padding: "5px 10px", color: "var(--bg-app)", fontSize: "14px",
                cursor: newTitle.trim() ? "pointer" : "not-allowed", opacity: newTitle.trim() ? 1 : 0.4,
              }}>+</button>
            </div>
          </div>

          {/* Agent filter tabs */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button onClick={() => setFilterAgent(null)} style={{
              background: filterAgent === null ? "var(--bg-card-elevated)" : "none",
              border: filterAgent === null ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "5px", padding: "2px 8px", fontSize: "11px",
              color: filterAgent === null ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
            }}>All</button>
            {AGENTS.filter(a => docs.some(d => d.agent === a)).map(a => (
              <button key={a} onClick={() => setFilterAgent(filterAgent === a ? null : a)} style={{
                background: filterAgent === a ? `${AGENT_COLORS[a]}22` : "none",
                border: filterAgent === a ? `1px solid ${AGENT_COLORS[a]}55` : "1px solid transparent",
                borderRadius: "5px", padding: "2px 8px", fontSize: "11px",
                color: filterAgent === a ? AGENT_COLORS[a] : "var(--text-muted)", cursor: "pointer", textTransform: "capitalize",
              }}>{a}</button>
            ))}
          </div>

          {/* Doc list — grouped by agent */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                {docs.length === 0 ? "No documents yet" : "No results"}
              </div>
            ) : (
              <>
                {Object.entries(grouped).map(([agent, agentDocs]) => (
                  <div key={agent}>
                    {/* Agent section header */}
                    <div style={{
                      padding: "10px 14px 4px",
                      fontSize: "10px", fontWeight: 700,
                      color: AGENT_COLORS[agent] ?? "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      position: "sticky", top: 0,
                      background: "var(--bg-secondary)",
                    }}>
                      {agent} · {agentDocs.length}
                    </div>
                    {agentDocs.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
                      const isSelected = doc._id === selectedId;
                      return (
                        <div key={doc._id} onClick={() => setSelectedId(doc._id)} style={{
                          padding: "7px 14px",
                          cursor: "pointer",
                          background: isSelected ? "var(--bg-card-elevated)" : "transparent",
                          borderLeft: `2px solid ${isSelected ? (AGENT_COLORS[agent] ?? "var(--border-default)") : "transparent"}`,
                          transition: "background 0.1s",
                        }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-card)"; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ fontSize: "12px", color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isSelected ? 500 : 400, lineHeight: 1.35 }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {formatDate(doc.updatedAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 4px", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      other · {ungrouped.length}
                    </div>
                    {ungrouped.map(doc => {
                      const isSelected = doc._id === selectedId;
                      return (
                        <div key={doc._id} onClick={() => setSelectedId(doc._id)} style={{
                          padding: "7px 14px", cursor: "pointer",
                          background: isSelected ? "var(--bg-card-elevated)" : "transparent",
                          borderLeft: `2px solid ${isSelected ? "var(--border-default)" : "transparent"}`,
                        }}>
                          <div style={{ fontSize: "12px", color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isSelected ? 500 : 400 }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{formatDate(doc.updatedAt)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border-subtle)", fontSize: "10px", color: "var(--text-muted)" }}>
            {filtered.length} of {docs.length} docs
          </div>
        </div>

        {/* Right panel — document content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedDoc ? (
            <>
              {/* Doc title bar */}
              <div style={{
                padding: "20px 56px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                flexShrink: 0,
              }}>
                <div style={{ maxWidth: "780px", margin: "0 auto" }}>
                  {editingTitle ? (
                    <input
                      autoFocus
                      defaultValue={selectedDoc.title}
                      onBlur={e => handleTitleSave(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      style={{
                        fontSize: "24px", fontWeight: 700, background: "none", border: "none",
                        borderBottom: "1px solid var(--border-default)",
                        color: "var(--text-primary)", outline: "none", width: "100%", padding: "0",
                      }}
                    />
                  ) : (
                    <h1 onClick={() => setEditingTitle(true)} style={{
                      fontSize: "24px", fontWeight: 700, color: "var(--text-primary)",
                      margin: 0, cursor: "text", lineHeight: 1.3,
                    }}>
                      {selectedDoc.title}
                    </h1>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px" }}>
                    {selectedDoc.agent && (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: agentColor, textTransform: "capitalize" }}>
                        {selectedDoc.agent}
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(selectedDoc.updatedAt)}</span>
                    <button onClick={async () => {
                      if (confirm(`Delete "${selectedDoc.title}"?`)) {
                        await remove({ id: selectedDoc._id });
                        setSelectedId(null);
                      }
                    }} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {editing ? (
                  <RichEditor content={selectedDoc.content} onChange={handleChange} placeholder="Start writing…" />
                ) : (
                  <div style={{ padding: "32px 56px", maxWidth: "780px", margin: "0 auto" }}>
                    <MarkdownView content={selectedDoc.content} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "8px" }}>
              <div style={{ fontSize: "28px" }}>📄</div>
              <div style={{ fontSize: "14px" }}>Select a document</div>
              <div style={{ fontSize: "12px" }}>{docs.length} document{docs.length !== 1 ? "s" : ""} in {board}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .markdown-body { color: var(--text-secondary); font-size: 14px; line-height: 1.75; }
        .markdown-body h1 { font-size: 1.75em; font-weight: 700; margin: 0 0 20px; color: var(--text-primary); }
        .markdown-body h2 { font-size: 1.3em; font-weight: 600; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
        .markdown-body h3 { font-size: 1.1em; font-weight: 600; margin: 28px 0 8px; color: var(--text-primary); }
        .markdown-body h4 { font-size: 1em; font-weight: 600; margin: 20px 0 6px; color: var(--text-primary); }
        .markdown-body p { margin: 0 0 14px; }
        .markdown-body ul, .markdown-body ol { margin: 0 0 14px; padding-left: 22px; }
        .markdown-body li { margin-bottom: 5px; }
        .markdown-body li > ul, .markdown-body li > ol { margin-top: 4px; margin-bottom: 0; }
        .markdown-body code { background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: monospace; color: var(--text-primary); }
        .markdown-body pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0 0 16px; }
        .markdown-body pre code { background: none; border: none; padding: 0; font-size: 13px; line-height: 1.6; }
        .markdown-body blockquote { border-left: 3px solid var(--border-default); margin: 0 0 14px; padding: 4px 16px; color: var(--text-muted); }
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 13px; }
        .markdown-body th { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 8px 12px; text-align: left; font-weight: 600; color: var(--text-primary); }
        .markdown-body td { border: 1px solid var(--border-subtle); padding: 8px 12px; }
        .markdown-body tr:nth-child(even) td { background: var(--bg-card); }
        .markdown-body a { color: var(--text-primary); text-decoration: underline; }
        .markdown-body hr { border: none; border-top: 1px solid var(--border-subtle); margin: 28px 0; }
        .markdown-body strong { color: var(--text-primary); font-weight: 600; }
        .markdown-body em { font-style: italic; }
      `}</style>
    </div>
  );
}
