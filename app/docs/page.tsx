"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RichEditor } from "@/app/components/editor/RichEditor";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/app/components/Nav";
import { marked } from "marked";

type BoardFilter = "all" | "marketing" | "product";

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

function folderLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MARKDOWN_STYLES = `
  .markdown-body { color: var(--text-secondary); font-size: 15px; line-height: 1.8; }
  .markdown-body h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 18px; color: var(--text-primary); }
  .markdown-body h2 { font-size: 1.3em; font-weight: 600; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
  .markdown-body h3 { font-size: 1.1em; font-weight: 600; margin: 28px 0 8px; color: var(--text-primary); }
  .markdown-body p { margin: 0 0 16px; }
  .markdown-body ul, .markdown-body ol { margin: 0 0 16px; padding-left: 24px; }
  .markdown-body li { margin-bottom: 6px; }
  .markdown-body code { background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; color: var(--text-primary); }
  .markdown-body pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 18px; overflow-x: auto; margin: 0 0 18px; }
  .markdown-body pre code { background: none; border: none; padding: 0; font-size: 13px; }
  .markdown-body blockquote { border-left: 3px solid var(--border-default); margin: 0 0 16px; padding: 4px 18px; color: var(--text-muted); }
  .markdown-body table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 13px; }
  .markdown-body th { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 9px 14px; text-align: left; font-weight: 600; }
  .markdown-body td { border: 1px solid var(--border-subtle); padding: 9px 14px; }
  .markdown-body a { color: var(--text-primary); text-decoration: underline; }
  .markdown-body hr { border: none; border-top: 1px solid var(--border-subtle); margin: 28px 0; }
  .markdown-body strong { color: var(--text-primary); font-weight: 600; }
`;

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // View state: null = root, string = folder name, doc = open doc
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [openDoc, setOpenDocState] = useState<Doc | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [search, setSearch] = useState("");
  const [commentBubble, setCommentBubble] = useState<{ x: number; y: number; text: string } | null>(null);
  const [commentPrompt, setCommentPrompt] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const allDocs = (useQuery(api.docs.listAll) ?? []) as Doc[];
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  // Filter by board
  const filtered = boardFilter === "all" ? allDocs : allDocs.filter(d => d.board === boardFilter);

  // Search filter
  const visible = search
    ? filtered.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.path.toLowerCase().includes(search.toLowerCase()))
    : filtered;

  // Build folder → docs map
  const folderMap: Record<string, Doc[]> = {};
  const rootFiles: Doc[] = [];
  for (const doc of visible) {
    const parts = doc.path?.split("/") ?? [];
    if (parts.length >= 2) {
      const folder = parts[0];
      if (!folderMap[folder]) folderMap[folder] = [];
      folderMap[folder].push(doc);
    } else {
      rootFiles.push(doc);
    }
  }
  const folders = Object.keys(folderMap).sort();

  // Files in current folder (sorted by date)
  const currentFiles = currentFolder
    ? (folderMap[currentFolder] ?? []).sort((a, b) => b.updatedAt - a.updatedAt)
    : [];

  async function handleChange(content: string) {
    if (!openDoc) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      await save({ id: openDoc._id, content });
      setSaveStatus("saved");
    }, 1000);
  }

  async function handleTextSelection() {
    if (editing) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setCommentBubble({ x: rect.left + rect.width / 2, y: rect.top - 10, text: selectedText });
        setCommentPrompt("");
      }
    }
  }

  async function sendComment() {
    if (!commentPrompt.trim() || !commentBubble || !openDoc) return;
    setSendingComment(true);
    try {
      await fetch("https://first-viper-528.convex.site/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: "business", createdBy: "vlad", assignees: ["anya"], priority: "medium",
          title: `[Doc: ${openDoc.title}] ${commentPrompt.slice(0, 60)}`,
          description: `**Selected text:**\n> ${commentBubble.text}\n\n**Request:**\n${commentPrompt}\n\n**Doc path:** ${openDoc.path}`,
        }),
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setCommentBubble(null);
    } catch (e) { console.error(e); }
    finally { setSendingComment(false); }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const bubble = document.getElementById("comment-bubble");
      if (bubble && !bubble.contains(e.target as Node)) setCommentBubble(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Breadcrumb
  function Breadcrumb() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
        <span
          onClick={() => { setCurrentFolder(null); setOpenDocState(null); setEditing(false); }}
          style={{ cursor: "pointer", color: currentFolder || openDoc ? "var(--text-muted)" : "var(--text-primary)", fontWeight: currentFolder || openDoc ? 400 : 600 }}
        >
          All files
        </span>
        {currentFolder && (
          <>
            <span>/</span>
            <span
              onClick={() => { setOpenDocState(null); setEditing(false); }}
              style={{ cursor: openDoc ? "pointer" : "default", color: openDoc ? "var(--text-muted)" : "var(--text-primary)", fontWeight: openDoc ? 400 : 600 }}
            >
              📁 {folderLabel(currentFolder)}
            </span>
          </>
        )}
        {openDoc && (
          <>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{openDoc.title}</span>
          </>
        )}
      </div>
    );
  }

  // ROOT VIEW — folder grid
  if (!currentFolder && !openDoc) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
        <Nav active="/docs" right={<>
          {(["all", "marketing", "product"] as BoardFilter[]).map(b => (
            <button key={b} onClick={() => setBoardFilter(b)} style={{
              background: boardFilter === b ? "var(--bg-card-elevated)" : "none",
              border: boardFilter === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: boardFilter === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: boardFilter === b ? 600 : 400, cursor: "pointer",
            }}>{b}</button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "160px" }}
          />
        </>} />
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <Breadcrumb />

          {search ? (
            // Search results — flat list
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {visible.length} result{visible.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {visible.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => (
                  <div key={doc._id} onClick={() => { const f = doc.path?.split("/")[0]; setCurrentFolder(f ?? null); setOpenDocState(doc); }}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", marginBottom: "4px" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  >
                    <span style={{ fontSize: "16px" }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{doc.path}</div>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{formatDate(doc.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Folder + file grid
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
                {folders.map(folder => (
                  <div key={folder} onClick={() => setCurrentFolder(folder)}
                    style={{ padding: "20px 16px", borderRadius: "10px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "10px" }}>📁</div>
                    <div title={folderLabel(folder)} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folderLabel(folder)}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{folderMap[folder].length} files</div>
                  </div>
                ))}
                {rootFiles.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => (
                  <div key={doc._id} onClick={() => setOpenDocState(doc)}
                    style={{ padding: "20px 16px", borderRadius: "10px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "10px" }}>📄</div>
                    <div title={doc.title} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
        <style>{MARKDOWN_STYLES}</style>
      </div>
    );
  }

  // FOLDER VIEW — file list
  if (currentFolder && !openDoc) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
        <Nav active="/docs" right={<>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "160px" }}
          />
        </>} />
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <Breadcrumb />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
            {currentFiles.map(doc => (
              <div key={doc._id} onClick={() => setOpenDocState(doc)}
                style={{ padding: "20px 16px", borderRadius: "10px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              >
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📄</div>
                <div title={doc.title} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{MARKDOWN_STYLES}</style>
      </div>
    );
  }

  // DOC VIEW — full screen reader/editor
  if (openDoc) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
        <Nav active="/docs" right={<>
          {saveStatus !== "saved" && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{saveStatus === "saving" ? "Saving…" : "●"}</span>}
          <button onClick={() => setEditing(e => !e)} style={{
            background: editing ? "var(--bg-card-elevated)" : "none",
            border: `1px solid ${editing ? "var(--border-default)" : "var(--border-subtle)"}`,
            borderRadius: "6px", padding: "4px 14px", fontSize: "12px",
            color: editing ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
          }}>{editing ? "Preview" : "Edit"}</button>
          <button onClick={async () => {
            if (confirm(`Delete "${openDoc.title}"?`)) { await remove({ id: openDoc._id }); setOpenDocState(null); }
          }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>Delete</button>
        </>} />
        <div style={{ flex: 1, overflowY: "auto", padding: "40px 0" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 40px" }}>
            <Breadcrumb />
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{openDoc.title}</h1>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "32px" }}>Updated {formatDate(openDoc.updatedAt)}</div>
            {editing ? (
              <RichEditor content={openDoc.content} onChange={handleChange} placeholder="Start writing…" />
            ) : (
              <div onMouseUp={handleTextSelection}>
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: marked.parse(openDoc.content, { async: false }) as string }} />
              </div>
            )}
          </div>
        </div>

        {/* Select-and-comment bubble */}
        {commentBubble && (
          <div id="comment-bubble" style={{
            position: "fixed", left: commentBubble.x, top: commentBubble.y, transform: "translateX(-50%) translateY(-100%)",
            background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px",
            padding: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 1000, minWidth: "280px",
          }}>
            <textarea value={commentPrompt} onChange={e => setCommentPrompt(e.target.value)} placeholder="Ask Anya…" autoFocus
              style={{ width: "100%", minHeight: "60px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", marginBottom: "8px", boxSizing: "border-box" }}
            />
            <button onClick={sendComment} disabled={!commentPrompt.trim() || sendingComment}
              style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "6px 16px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer", width: "100%", opacity: commentPrompt.trim() ? 1 : 0.5 }}>
              {sendingComment ? "Sending…" : "Ask Anya"}
            </button>
          </div>
        )}

        {showToast && (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "12px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1001 }}>
            <span style={{ color: "var(--text-primary)", fontSize: "14px" }}>Sent to Anya ✓</span>
          </div>
        )}

        <style>{MARKDOWN_STYLES}</style>
      </div>
    );
  }

  return null;
}
