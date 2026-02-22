"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RichEditor } from "@/app/components/editor/RichEditor";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { marked } from "marked";

type BoardFilter = "all" | "marketing" | "product";

// Folder tree structure type
type Doc = {
  _id: Id<"docs">;
  path: string;
  title: string;
  content: string;
  agent?: string;
  board: string;
  updatedAt: number;
  cardId?: Id<"cards">;
};
type FolderTree = {
  folders: Record<string, Doc[]>;
  files: Doc[];
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MarkdownView({ content }: { content: string }) {
  const html = marked.parse(content, { async: false }) as string;
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

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

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [openId, setOpenId] = useState<Id<"docs"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editingTitle, setEditingTitle] = useState(false);
  const [search, setSearch] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [commentBubble, setCommentBubble] = useState<{ x: number; y: number; text: string } | null>(null);
  const [commentPrompt, setCommentPrompt] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setOpenId(id as Id<"docs">);
  }, [searchParams]);

  useEffect(() => { setEditing(false); setEditingTitle(false); }, [openId]);

  const allDocs = useQuery(api.docs.listAll) ?? [];
  const openDoc = useQuery(api.docs.get, openId ? { id: openId } : "skip");
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  // Filter docs by board
  const filteredDocs = boardFilter === "all"
    ? allDocs
    : allDocs.filter(d => d.board === boardFilter);

  // Search filter
  const searchLower = search.toLowerCase();
  const visibleDocs = search
    ? filteredDocs.filter(d => d.title.toLowerCase().includes(searchLower))
    : filteredDocs;

  // Build folder tree from paths
  const tree: FolderTree = { folders: {}, files: [] };
  for (const doc of visibleDocs) {
    if (!doc.path) {
      tree.files.push(doc);
      continue;
    }
    const pathParts = doc.path.split('/');
    if (pathParts.length === 1) {
      // No folder, just a file at root
      tree.files.push(doc);
    } else {
      // Has folder
      const folder = pathParts[0];
      if (!tree.folders[folder]) tree.folders[folder] = [];
      tree.folders[folder].push(doc);
    }
  }

  // Sort folders alphabetically
  const folderKeys = Object.keys(tree.folders).sort();

  // Sort files within each folder by updatedAt desc
  for (const folder of folderKeys) {
    tree.folders[folder].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  tree.files.sort((a, b) => b.updatedAt - a.updatedAt);

  function toggleCollapse(folder: string) {
    setCollapsed(prev => ({ ...prev, [folder]: !prev[folder] }));
  }

  async function createDoc() {
    if (!newDocTitle.trim()) return;
    setCreating(true);
    const slug = newDocTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const path = `vlad/${date}-${slug}.md`;
    const board = boardFilter === "all" ? "marketing" : boardFilter;
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

  async function handleTextSelection() {
    if (editing) return; // Only active in preview mode
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setCommentBubble({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          text: selectedText
        });
        setCommentPrompt("");
      }
    }
  }

  async function sendComment() {
    if (!commentPrompt.trim() || !commentBubble || !openDoc) return;
    setSendingComment(true);

    try {
      const response = await fetch("https://first-viper-528.convex.site/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: "business",
          createdBy: "vlad",
          assignees: ["anya"],
          priority: "medium",
          title: `[Doc: ${openDoc.title}] ${commentPrompt.slice(0, 60)}`,
          description: `**Selected text:**\n> ${commentBubble.text}\n\n**Request:**\n${commentPrompt}\n\n**Doc path:** ${openDoc.path || "unknown"}`
        })
      });

      if (response.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setCommentBubble(null);
        setCommentPrompt("");
      }
    } catch (error) {
      console.error("Failed to send comment:", error);
    } finally {
      setSendingComment(false);
    }
  }

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const bubble = document.getElementById("comment-bubble");
      if (bubble && !bubble.contains(e.target as Node)) {
        setCommentBubble(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);


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
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>docs</span>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/stack" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>stack</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/calendar" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>calendar</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/board" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>board</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          {(["all", "marketing", "product"] as BoardFilter[]).map(b => (
            <button key={b} onClick={() => setBoardFilter(b)} style={{
              background: boardFilter === b ? "var(--bg-card-elevated)" : "none",
              border: boardFilter === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: boardFilter === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: boardFilter === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs…"
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

      {/* Body: Sidebar + Panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <div style={{
          width: "240px", flexShrink: 0, borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)", overflowY: "auto", padding: "12px 0",
        }}>
          {visibleDocs.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              {search ? "No results" : "No documents"}
            </div>
          ) : (
            <>
              {/* Render folders */}
              {folderKeys.map(folder => {
                const docs = tree.folders[folder];
                const isCollapsed = collapsed[folder] ?? false;
                return (
                  <div key={folder}>
                    {/* Folder header */}
                    <button
                      onClick={() => toggleCollapse(folder)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "8px",
                        padding: "6px 16px", background: "none", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{isCollapsed ? "▸" : "▾"}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", flex: 1, letterSpacing: "0.04em" }}>
                        {({
                          aria: "🧠 Strategy",
                          maya: "✍️ Copy",
                          leo: "📣 Social",
                          sage: "🔍 SEO",
                          rex: "📊 Finance",
                          jessica: "🤝 Outreach",
                          nova: "🎨 Creative",
                          campaign: "🚀 Campaigns",
                          vlad: "👤 Vlad",
                        } as Record<string, string>)[folder] ?? `📁 ${folder.charAt(0).toUpperCase() + folder.slice(1)}`}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: "4px", padding: "1px 5px" }}>{docs.length}</span>
                    </button>
                    {/* Doc list */}
                    {!isCollapsed && docs.map(doc => {
                      const isActive = openId === doc._id;
                      return (
                        <button
                          key={doc._id}
                          onClick={() => setOpenId(doc._id)}
                          style={{
                            width: "100%", display: "block", textAlign: "left",
                            padding: "5px 16px 5px 32px", background: isActive ? "var(--bg-card-elevated)" : "none",
                            border: "none", borderLeft: isActive ? "2px solid var(--border-default)" : "2px solid transparent",
                            cursor: "pointer", color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                            fontSize: "12px", lineHeight: 1.4,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                          title={doc.title}
                        >
                          {doc.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Render root files (no folder) */}
              {tree.files.length > 0 && (
                <div>
                  {tree.files.map(doc => {
                    const isActive = openId === doc._id;
                    return (
                      <button
                        key={doc._id}
                        onClick={() => setOpenId(doc._id)}
                        style={{
                          width: "100%", display: "block", textAlign: "left",
                          padding: "5px 16px", background: isActive ? "var(--bg-card-elevated)" : "none",
                          border: "none", borderLeft: isActive ? "2px solid var(--border-default)" : "2px solid transparent",
                          cursor: "pointer", color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                          fontSize: "12px", lineHeight: 1.4,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                        title={doc.title}
                      >
                        {doc.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {openId && openDoc ? (
            <>
              {/* Panel header */}
              <div style={{
                borderBottom: "1px solid var(--border-subtle)", padding: "0 24px",
                height: "48px", display: "flex", alignItems: "center",
                justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0, gap: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  {editingTitle ? (
                    <input autoFocus defaultValue={openDoc.title}
                      onBlur={e => handleTitleSave(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingTitle(false); }}
                      style={{ fontSize: "13px", background: "none", border: "none", borderBottom: "1px solid var(--border-default)", color: "var(--text-primary)", outline: "none", minWidth: "200px" }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingTitle(true)}
                      style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "text", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={openDoc.title}
                    >
                      {openDoc.title}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{formatDate(openDoc.updatedAt)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
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
              </div>

              {/* Panel content */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {editing ? (
                  <RichEditor content={openDoc.content} onChange={handleChange} placeholder="Start writing…" />
                ) : (
                  <div style={{ padding: "40px 56px", maxWidth: "820px" }} onMouseUp={handleTextSelection}>
                    <MarkdownView content={openDoc.content} />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "28px" }}>📄</div>
              <div style={{ fontSize: "14px" }}>Select a document</div>
              <div style={{ fontSize: "12px", opacity: 0.7 }}>{allDocs.length} document{allDocs.length !== 1 ? "s" : ""} available</div>
            </div>
          )}
        </div>
      </div>

      {/* Comment bubble */}
      {commentBubble && (
        <div
          id="comment-bubble"
          style={{
            position: "fixed",
            left: `${commentBubble.x}px`,
            top: `${commentBubble.y}px`,
            transform: "translateX(-50%)",
            background: "var(--bg-card-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "280px"
          }}
        >
          <textarea
            value={commentPrompt}
            onChange={e => setCommentPrompt(e.target.value)}
            placeholder="Ask Anya..."
            autoFocus
            style={{
              width: "100%",
              minHeight: "60px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "8px",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
              resize: "vertical",
              marginBottom: "8px"
            }}
          />
          <button
            onClick={sendComment}
            disabled={!commentPrompt.trim() || sendingComment}
            style={{
              background: "var(--text-primary)",
              border: "none",
              borderRadius: "6px",
              padding: "6px 16px",
              color: "var(--bg-app)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: commentPrompt.trim() ? "pointer" : "not-allowed",
              opacity: commentPrompt.trim() ? 1 : 0.5,
              width: "100%"
            }}
          >
            {sendingComment ? "Sending..." : "Ask Anya"}
          </button>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--bg-card-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "12px 20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ color: "var(--text-primary)", fontSize: "14px" }}>Sent to Anya ✓</span>
        </div>
      )}

      <style>{MARKDOWN_STYLES}</style>
    </div>
  );
}
