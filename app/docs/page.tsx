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
};

function folderLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CARD_STYLE = {
  padding: "12px 14px",
  borderRadius: "8px",
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  cursor: "pointer",
  transition: "border-color 0.15s",
  position: "relative" as const,
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const MD = `
  .md { color: var(--text-secondary); font-size: 15px; line-height: 1.8; }
  .md h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 18px; color: var(--text-primary); }
  .md h2 { font-size: 1.3em; font-weight: 600; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
  .md h3 { font-size: 1.1em; font-weight: 600; margin: 28px 0 8px; color: var(--text-primary); }
  .md p { margin: 0 0 16px; }
  .md ul, .md ol { margin: 0 0 16px; padding-left: 24px; }
  .md li { margin-bottom: 6px; }
  .md code { background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; color: var(--text-primary); }
  .md pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 18px; overflow-x: auto; margin: 0 0 18px; }
  .md pre code { background: none; border: none; padding: 0; font-size: 13px; }
  .md blockquote { border-left: 3px solid var(--border-default); margin: 0 0 16px; padding: 4px 18px; color: var(--text-muted); }
  .md table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 13px; }
  .md th { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 9px 14px; text-align: left; font-weight: 600; color: var(--text-primary); }
  .md td { border: 1px solid var(--border-subtle); padding: 9px 14px; }
  .md a { color: var(--text-primary); text-decoration: underline; }
  .md hr { border: none; border-top: 1px solid var(--border-subtle); margin: 28px 0; }
  .md strong { color: var(--text-primary); font-weight: 600; }
  .md img { max-width: 100%; border-radius: 8px; }
  .rich-editor { color: var(--text-secondary); font-size: 15px; line-height: 1.8; outline: none; }
  .rich-editor h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 18px; color: var(--text-primary); }
  .rich-editor h2 { font-size: 1.3em; font-weight: 600; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
  .rich-editor h3 { font-size: 1.1em; font-weight: 600; margin: 28px 0 8px; color: var(--text-primary); }
  .rich-editor p { margin: 0 0 16px; }
  .rich-editor ul, .rich-editor ol { margin: 0 0 16px; padding-left: 24px; }
  .rich-editor li { margin-bottom: 6px; }
  .rich-editor code { background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; color: var(--text-primary); }
  .rich-editor pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 18px; overflow-x: auto; margin: 0 0 18px; }
  .rich-editor strong { color: var(--text-primary); font-weight: 600; }
  .rich-editor blockquote { border-left: 3px solid var(--border-default); margin: 0 0 16px; padding: 4px 18px; color: var(--text-muted); }
  .tiptap.ProseMirror { outline: none; }
  .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: var(--text-muted); pointer-events: none; height: 0; }
`;

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven navigation: ?folder=seo, ?doc=<id>
  const currentFolder = searchParams.get("folder");
  const openDocId = searchParams.get("doc") as Id<"docs"> | null;

  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [search, setSearch] = useState("");
  const [newFolderInput, setNewFolderInput] = useState("");
  const [newFileInput, setNewFileInput] = useState("");
  const [commentBubble, setCommentBubble] = useState<{ x: number; y: number; text: string } | null>(null);
  const [commentPrompt, setCommentPrompt] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const allDocs = (useQuery(api.docs.listAll) ?? []) as Doc[];
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  const openDoc = openDocId ? (allDocs.find(d => d._id === openDocId) ?? null) : null;

  // Reset editing when navigating away from a doc
  useEffect(() => { if (!openDocId) setEditing(false); }, [openDocId]);

  function navRoot() { router.push("/docs"); }
  function navFolder(f: string) { router.push(`/docs?folder=${encodeURIComponent(f)}`); }
  function navDoc(doc: Doc) { router.push(`/docs?folder=${encodeURIComponent(doc.path.split("/")[0])}&doc=${doc._id}`); }

  const filtered = boardFilter === "all" ? allDocs : allDocs.filter(d => d.board === boardFilter);
  const visible = search
    ? filtered.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.path.toLowerCase().includes(search.toLowerCase()))
    : filtered;

  // Build nested folder tree from paths
  // currentFolder can be "aria" or "aria/seo" or "aria/seo/deep" etc.
  function getItemsAtPath(prefix: string) {
    const subfolders = new Set<string>();
    const files: Doc[] = [];
    for (const doc of visible) {
      const docPath = doc.path ?? "";
      if (prefix) {
        if (!docPath.startsWith(prefix + "/")) continue;
        const rest = docPath.slice(prefix.length + 1);
        const parts = rest.split("/");
        if (parts.length === 1) {
          files.push(doc);
        } else {
          subfolders.add(parts[0]);
        }
      } else {
        const parts = docPath.split("/");
        if (parts.length === 1) {
          files.push(doc);
        } else {
          subfolders.add(parts[0]);
        }
      }
    }
    return {
      folders: [...subfolders].sort(),
      files: files.sort((a, b) => b.updatedAt - a.updatedAt),
      countForFolder: (sub: string) => {
        const full = prefix ? `${prefix}/${sub}` : sub;
        return visible.filter(d => (d.path ?? "").startsWith(full + "/") || (d.path ?? "") === full).length;
      }
    };
  }

  // Legacy compat
  const folderMap: Record<string, Doc[]> = {};
  const rootFiles: Doc[] = [];
  for (const doc of visible) {
    const parts = doc.path?.split("/") ?? [];
    if (parts.length >= 2) {
      const f = parts[0];
      if (!folderMap[f]) folderMap[f] = [];
      folderMap[f].push(doc);
    } else {
      rootFiles.push(doc);
    }
  }

  const currentView = getItemsAtPath(currentFolder ?? "");
  const folders = currentFolder ? currentView.folders : Object.keys(folderMap).sort();
  const currentFiles = currentFolder ? currentView.files : [];

  async function createFolder() {
    const name = newFolderInput.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!name) return;
    const date = new Date().toISOString().slice(0, 10);
    const prefix = currentFolder ? `${currentFolder}/${name}` : name;
    await upsert({ path: `${prefix}/${date}-untitled.md`, title: "Untitled", content: "# Untitled\n\n", agent: "vlad", board: "marketing" });
    setNewFolderInput("");
    navFolder(prefix);
  }

  async function createFile() {
    const title = newFileInput.trim();
    if (!title || !currentFolder) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const date = new Date().toISOString().slice(0, 10);
    const path = `${currentFolder}/${date}-${slug}.md`;
    const id = await upsert({ path, title, content: `# ${title}\n\n`, agent: "vlad", board: "marketing" });
    setNewFileInput("");
    setEditing(true);
    router.push(`/docs?folder=${encodeURIComponent(currentFolder)}&doc=${id}`);
  }

  async function deleteFolder(folder: string) {
    if (!confirm(`Delete all files in "${folderLabel(folder)}"? This cannot be undone.`)) return;
    for (const doc of (folderMap[folder] ?? [])) await remove({ id: doc._id });
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await remove({ id: doc._id });
    if (openDocId === doc._id) navFolder(doc.path.split("/")[0]);
  }

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

  async function handleTitleSave(title: string) {
    if (!openDoc || !title.trim()) return;
    await save({ id: openDoc._id, title });
  }

  async function handleTextSelection() {
    if (editing) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) return;
    const rect = sel?.getRangeAt(0).getBoundingClientRect();
    if (rect) setCommentBubble({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
    setCommentPrompt("");
  }

  async function sendComment() {
    if (!commentPrompt.trim() || !commentBubble || !openDoc) return;
    setSendingComment(true);
    try {
      await fetch("https://first-viper-528.convex.site/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: "business", createdBy: "vlad", assignees: ["anya"], priority: "medium", title: `[Doc: ${openDoc.title}] ${commentPrompt.slice(0, 60)}`, description: `**Selected text:**\n> ${commentBubble.text}\n\n**Request:**\n${commentPrompt}\n\n**Doc path:** ${openDoc.path}` }),
      });
      setShowToast(true); setTimeout(() => setShowToast(false), 2000); setCommentBubble(null);
    } catch (e) { console.error(e); } finally { setSendingComment(false); }
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { const b = document.getElementById("cbubble"); if (b && !b.contains(e.target as Node)) setCommentBubble(null); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Card hover handlers
  function cardHover(show: boolean) {
    return (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.borderColor = show ? "var(--border-default)" : "var(--border-subtle)";
      const btn = e.currentTarget.querySelector(".del-x") as HTMLElement | null;
      if (btn) btn.style.opacity = show ? "1" : "0";
    };
  }

  // Breadcrumb — supports nested paths like "aria/seo/deep"
  const Breadcrumb = () => {
    const folderParts = currentFolder ? currentFolder.split("/") : [];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", marginBottom: "28px", flexWrap: "wrap" }}>
        <span onClick={navRoot}
          style={{ cursor: "pointer", color: currentFolder || openDoc ? "var(--text-muted)" : "var(--text-primary)", fontWeight: currentFolder || openDoc ? 400 : 600 }}>
          All files
        </span>
        {folderParts.map((part, i) => {
          const path = folderParts.slice(0, i + 1).join("/");
          const isLast = i === folderParts.length - 1 && !openDoc;
          return <span key={path} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span onClick={() => !isLast && navFolder(path)}
              style={{ cursor: isLast ? "default" : "pointer", color: isLast ? "var(--text-primary)" : "var(--text-muted)", fontWeight: isLast ? 600 : 400 }}>
              {folderLabel(part)}
            </span>
          </span>;
        })}
        {openDoc && <>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{openDoc.title}</span>
        </>}
      </div>
    );
  };

  // ── ROOT VIEW ──────────────────────────────────────────────
  if (!currentFolder && !openDoc) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/docs" right={<>
        {(["all", "marketing", "product"] as BoardFilter[]).map(b => (
          <button key={b} onClick={() => setBoardFilter(b)} style={{ background: boardFilter === b ? "var(--bg-card-elevated)" : "none", border: boardFilter === b ? "1px solid var(--border-default)" : "1px solid transparent", borderRadius: "6px", padding: "3px 10px", color: boardFilter === b ? "var(--text-primary)" : "var(--text-muted)", fontSize: "12px", fontWeight: boardFilter === b ? 600 : 400, cursor: "pointer" }}>{b}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "130px" }} />
        <input value={newFolderInput} onChange={e => setNewFolderInput(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} placeholder="New folder…" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "120px" }} />
        <button onClick={createFolder} disabled={!newFolderInput.trim()} style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "5px 12px", color: "var(--bg-app)", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: newFolderInput.trim() ? 1 : 0.4 }}>+ Folder</button>
      </>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <Breadcrumb />
        {search ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {visible.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => (
              <div key={doc._id} style={CARD_STYLE} onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)} onClick={() => navDoc(doc)}>
                <button className="del-x" onClick={e => { e.stopPropagation(); deleteDoc(doc); }} style={{ position: "absolute", top: 8, right: 8, opacity: 0, background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", transition: "opacity 0.15s" }}>✕</button>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>📄</span>
                <div style={{ minWidth: 0 }}>
                  <div title={doc.title} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.path}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {folders.map(folder => (
              <div key={folder} style={CARD_STYLE} onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)} onClick={() => navFolder(folder)}>
                <button className="del-x" onClick={e => { e.stopPropagation(); deleteFolder(folder); }} style={{ position: "absolute", top: 8, right: 8, opacity: 0, background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", transition: "opacity 0.15s" }}>✕</button>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>📁</span>
                <div style={{ minWidth: 0 }}>
                  <div title={folderLabel(folder)} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folderLabel(folder)}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{(folderMap[folder] ?? []).length} files</div>
                </div>
              </div>
            ))}
            {rootFiles.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => (
              <div key={doc._id} style={CARD_STYLE} onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)} onClick={() => navDoc(doc)}>
                <button className="del-x" onClick={e => { e.stopPropagation(); deleteDoc(doc); }} style={{ position: "absolute", top: 8, right: 8, opacity: 0, background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", transition: "opacity 0.15s" }}>✕</button>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>📄</span>
                <div style={{ minWidth: 0 }}>
                  <div title={doc.title} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{MD}</style>
    </div>
  );

  // ── FOLDER VIEW ────────────────────────────────────────────
  if (currentFolder && !openDoc) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/docs" right={<>
        <input value={newFolderInput} onChange={e => setNewFolderInput(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} placeholder="New subfolder…" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "120px" }} />
        <button onClick={createFolder} disabled={!newFolderInput.trim()} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 12px", color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: newFolderInput.trim() ? 1 : 0.4 }}>+ Folder</button>
        <input value={newFileInput} onChange={e => setNewFileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && createFile()} placeholder="New file…" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "120px" }} />
        <button onClick={createFile} disabled={!newFileInput.trim()} style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "5px 12px", color: "var(--bg-app)", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: newFileInput.trim() ? 1 : 0.4 }}>+ File</button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "130px" }} />
      </>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <Breadcrumb />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
          {/* Subfolders first */}
          {currentView.folders.map(sub => {
            const fullPath = `${currentFolder}/${sub}`;
            return (
              <div key={sub} style={CARD_STYLE} onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)} onClick={() => navFolder(fullPath)}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>📁</span>
                <div style={{ minWidth: 0 }}>
                  <div title={folderLabel(sub)} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folderLabel(sub)}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{currentView.countForFolder(sub)} files</div>
                </div>
              </div>
            );
          })}
          {/* Files */}
          {currentFiles.map(doc => (
            <div key={doc._id} style={CARD_STYLE} onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)} onClick={() => navDoc(doc)}>
              <button className="del-x" onClick={e => { e.stopPropagation(); deleteDoc(doc); }} style={{ position: "absolute", top: 8, right: 8, opacity: 0, background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", transition: "opacity 0.15s" }}>✕</button>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>📄</span>
              <div style={{ minWidth: 0 }}>
                <div title={doc.title} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(doc.updatedAt)}</div>
              </div>
            </div>
          ))}
        </div>
        {currentView.folders.length === 0 && currentFiles.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", paddingTop: "60px" }}>Empty — create a file or subfolder above</div>}
      </div>
      <style>{MD}</style>
    </div>
  );

  // ── DOC VIEW ───────────────────────────────────────────────
  if (openDoc) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/docs" right={<>
        {saveStatus !== "saved" && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{saveStatus === "saving" ? "Saving…" : "●"}</span>}
        <button onClick={() => setEditing(e => !e)} style={{ background: editing ? "var(--bg-card-elevated)" : "none", border: `1px solid ${editing ? "var(--border-default)" : "var(--border-subtle)"}`, borderRadius: "6px", padding: "4px 14px", fontSize: "12px", color: editing ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }}>{editing ? "Preview" : "Edit"}</button>
        <button onClick={() => deleteDoc(openDoc)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>Delete</button>
      </>} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 40px" }}>
          <Breadcrumb />
          <div
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={e => { if (editing) handleTitleSave(e.currentTarget.textContent ?? ""); }}
            style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", outline: "none", cursor: editing ? "text" : "default" }}
          >
            {openDoc.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "36px" }}>Updated {formatDate(openDoc.updatedAt)}</div>

          {editing ? (
            <div className="rich-editor">
              <RichEditor content={openDoc.content} onChange={handleChange} placeholder="Start writing…" />
            </div>
          ) : (
            <div onMouseUp={handleTextSelection}>
              <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(openDoc.content, { async: false }) as string }} />
            </div>
          )}
        </div>
      </div>

      {commentBubble && (
        <div id="cbubble" style={{ position: "fixed", left: commentBubble.x, top: commentBubble.y, transform: "translateX(-50%) translateY(-100%)", background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 1000, minWidth: "260px" }}>
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
      <style>{MD}</style>
    </div>
  );

  return null;
}
