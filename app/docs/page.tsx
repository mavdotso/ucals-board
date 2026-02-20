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

// Given all docs and a current folder path ("" = root), return:
// - folders: unique top-level segments at this level
// - docs: docs directly in this folder (not nested deeper)
function getContents(
  docs: { _id: Id<"docs">; path: string; title: string; agent?: string; updatedAt: number }[],
  currentFolder: string
) {
  const prefix = currentFolder ? currentFolder + "/" : "";
  const inFolder = docs.filter(d => d.path.startsWith(prefix));

  const folderSet = new Set<string>();
  const directDocs: typeof docs = [];

  for (const doc of inFolder) {
    const rest = doc.path.slice(prefix.length);
    const parts = rest.split("/");
    if (parts.length === 1) {
      directDocs.push(doc);
    } else {
      folderSet.add(parts[0]);
    }
  }

  return { folders: Array.from(folderSet).sort(), directDocs };
}

// Breadcrumb segments from a folder path
function breadcrumbs(folder: string): { label: string; path: string }[] {
  if (!folder) return [];
  const parts = folder.split("/");
  return parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join("/") }));
}

export default function DocsPageWrapper() {
  return <Suspense><DocsPage /></Suspense>;
}

function DocsPage() {
  const [board, setBoard] = useState<Board>("marketing");
  const [currentFolder, setCurrentFolder] = useState(""); // "" = root
  const [openId, setOpenId] = useState<Id<"docs"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editingTitle, setEditingTitle] = useState(false);
  const [search, setSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
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

  // Search overrides folder navigation
  const isSearching = search.length > 0;
  const searchResults = isSearching
    ? docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    : [];

  const { folders, directDocs } = getContents(docs, currentFolder);
  const crumbs = breadcrumbs(currentFolder);

  async function createDoc() {
    if (!newDocTitle.trim()) return;
    setCreating(true);
    const slug = newDocTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const folder = currentFolder || "vlad";
    const path = `${folder}/${date}-${slug}.md`;
    const agent = AGENTS.find(a => path.startsWith(a + "/")) ?? "vlad";
    const id = await upsert({ path, title: newDocTitle, content: `# ${newDocTitle}\n\n`, agent, board });
    setOpenId(id as Id<"docs">);
    setNewDocTitle("");
    setCreating(false);
    setEditing(true);
  }

  function createFolder() {
    if (!newFolderName.trim()) return;
    const folderPath = currentFolder
      ? `${currentFolder}/${newFolderName.trim()}`
      : newFolderName.trim();
    setCurrentFolder(folderPath);
    setNewFolderName("");
    setShowNewFolder(false);
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

  // ── GRID VIEW ──────────────────────────────────────────────────────
  const gridItem = (icon: string, label: string, sub: string, color: string, onClick: () => void, key: string) => (
    <div key={key} onClick={onClick}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
        borderRadius: "10px", padding: "16px", cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
        display: "flex", flexDirection: "column", gap: "10px",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-card-elevated)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-card)"; }}
    >
      <div style={{ fontSize: "28px", lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35, marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "10px", color: color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</div>
      </div>
    </div>
  );

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
            <button key={b} onClick={() => { setBoard(b); setCurrentFolder(""); }} style={{
              background: board === b ? "var(--bg-card-elevated)" : "none",
              border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
              borderRadius: "6px", padding: "3px 10px",
              color: board === b ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs…"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "180px" }}
          />
          <button onClick={() => setShowNewFolder(v => !v)} style={{
            background: "none", border: "1px solid var(--border-default)", borderRadius: "6px",
            padding: "5px 12px", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer",
          }}>+ Folder</button>
          <div style={{ display: "flex", gap: "4px" }}>
            <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createDoc(); }}
              placeholder="New document…"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "170px" }}
            />
            <button onClick={createDoc} disabled={!newDocTitle.trim() || creating} style={{
              background: "var(--text-primary)", border: "none", borderRadius: "6px",
              padding: "5px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
              cursor: newDocTitle.trim() ? "pointer" : "not-allowed", opacity: newDocTitle.trim() ? 1 : 0.4,
            }}>+ Doc</button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span
          onClick={() => { setCurrentFolder(""); setSearch(""); }}
          style={{ fontSize: "12px", color: currentFolder || isSearching ? "var(--text-muted)" : "var(--text-primary)", cursor: "pointer", fontWeight: currentFolder ? 400 : 600 }}
        >
          All docs · {docs.length}
        </span>
        {crumbs.map((c, i) => (
          <>
            <span key={`sep-${i}`} style={{ color: "var(--border-default)", fontSize: "12px" }}>/</span>
            <span
              key={c.path}
              onClick={() => setCurrentFolder(c.path)}
              style={{
                fontSize: "12px",
                color: c.path === currentFolder ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: c.path === currentFolder ? 600 : 400,
              }}
            >
              {c.label}
            </span>
          </>
        ))}
        {isSearching && (
          <>
            <span style={{ color: "var(--border-default)", fontSize: "12px" }}>/</span>
            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
              Search: "{search}" · {searchResults.length}
            </span>
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", marginLeft: "4px" }}>✕</button>
          </>
        )}

        {/* New folder inline input */}
        {showNewFolder && (
          <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
              placeholder="Folder name…"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "4px 9px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "150px" }}
            />
            <button onClick={createFolder} style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "4px 10px", color: "var(--bg-app)", fontSize: "12px", cursor: "pointer" }}>Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>✕</button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {isSearching ? (
          // Search results — flat list across all folders
          searchResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)", fontSize: "14px" }}>No results for "{search}"</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
              {searchResults.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
                const color = AGENT_COLORS[doc.agent ?? ""] ?? "var(--text-muted)";
                return gridItem("📄", doc.title, doc.agent ?? "unknown", color, () => setOpenId(doc._id), doc._id);
              })}
            </div>
          )
        ) : (
          // Normal folder view
          folders.length === 0 && directDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>📂</div>
              <div style={{ fontSize: "14px" }}>This folder is empty</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>Create a document or folder to get started</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
              {/* Folders first */}
              {folders.map(folder => {
                const folderPath = currentFolder ? `${currentFolder}/${folder}` : folder;
                const count = docs.filter(d => d.path.startsWith(folderPath + "/")).length;
                const folderColor = AGENT_COLORS[folder] ?? "var(--text-muted)";
                return gridItem("📁", folder, `${count} doc${count !== 1 ? "s" : ""}`, folderColor, () => setCurrentFolder(folderPath), `folder-${folder}`);
              })}
              {/* Then docs */}
              {directDocs.sort((a, b) => b.updatedAt - a.updatedAt).map(doc => {
                const color = AGENT_COLORS[doc.agent ?? ""] ?? "var(--text-muted)";
                return gridItem("📄", doc.title, `${doc.agent ?? ""} · ${formatDate(doc.updatedAt)}`, color, () => setOpenId(doc._id), doc._id);
              })}
            </div>
          )
        )}
      </div>

      <style>{MARKDOWN_STYLES}</style>
    </div>
  );
}
