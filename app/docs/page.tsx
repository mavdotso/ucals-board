"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RichEditor } from "@/app/components/editor/RichEditor";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Board = "marketing" | "product";

const AGENT_COLORS: Record<string, string> = {
  aria: "#BD632F", maya: "#A4243B", leo: "#D8973C",
  sage: "#5C8A6C", rex: "#6B8A9C", vlad: "#A5A4A0",
};

const AGENTS = ["aria", "maya", "leo", "sage", "rex", "vlad"];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Build nested tree from flat path list
type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  docId?: Id<"docs">;
  agent?: string;
  updatedAt?: number;
};

function buildTree(docs: { _id: Id<"docs">; path: string; title: string; agent?: string; updatedAt: number }[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap: Record<string, TreeNode> = {};

  for (const doc of docs) {
    const parts = doc.path.split("/");
    let current = root;
    let fullPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      fullPath = fullPath ? `${fullPath}/${parts[i]}` : parts[i];
      if (!folderMap[fullPath]) {
        const folder: TreeNode = {
          name: parts[i], path: fullPath, isFolder: true, children: [],
          agent: parts[0] as string,
        };
        folderMap[fullPath] = folder;
        current.push(folder);
      }
      current = folderMap[fullPath].children;
    }

    current.push({
      name: doc.title,
      path: doc.path,
      isFolder: false,
      children: [],
      docId: doc._id,
      agent: doc.agent,
      updatedAt: doc.updatedAt,
    });
  }

  // Sort: folders first, then by name
  function sort(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sort(n.children));
  }
  sort(root);
  return root;
}

function TreeItem({
  node, depth, selectedId, onSelect, collapsed, onToggle,
}: {
  node: TreeNode; depth: number; selectedId: Id<"docs"> | null;
  onSelect: (id: Id<"docs">) => void;
  collapsed: Record<string, boolean>;
  onToggle: (path: string) => void;
}) {
  const isCollapsed = collapsed[node.path];
  const agentColor = AGENT_COLORS[node.agent ?? ""] ?? "var(--text-muted)";

  if (node.isFolder) {
    return (
      <div>
        <div
          onClick={() => onToggle(node.path)}
          style={{
            padding: `5px 14px 5px ${14 + depth * 14}px`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "10px", color: "var(--text-muted)", width: "10px" }}>
            {isCollapsed ? "▶" : "▼"}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: agentColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {node.name}
          </span>
        </div>
        {!isCollapsed && node.children.map(child => (
          <TreeItem key={child.path} node={child} depth={depth + 1}
            selectedId={selectedId} onSelect={onSelect} collapsed={collapsed} onToggle={onToggle} />
        ))}
      </div>
    );
  }

  const isSelected = node.docId === selectedId;
  return (
    <div
      onClick={() => node.docId && onSelect(node.docId)}
      style={{
        padding: `6px 14px 6px ${14 + depth * 14}px`,
        cursor: "pointer",
        background: isSelected ? "var(--bg-card)" : "none",
        borderLeft: isSelected ? `2px solid ${agentColor}` : "2px solid transparent",
        display: "flex", flexDirection: "column", gap: "2px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>
        {node.name}
      </div>
      {node.updatedAt && (
        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{formatDate(node.updatedAt)}</div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [board, setBoard] = useState<Board>("marketing");
  const [selectedId, setSelectedId] = useState<Id<"docs"> | null>(null);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPath, setNewPath] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const docs = useQuery(api.docs.list, { board }) ?? [];
  const selectedDoc = useQuery(api.docs.get, selectedId ? { id: selectedId } : "skip");
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  const filteredDocs = filterAgent ? docs.filter(d => d.agent === filterAgent) : docs;
  const tree = buildTree(filteredDocs);

  function toggleCollapse(path: string) {
    setCollapsed(prev => ({ ...prev, [path]: !prev[path] }));
  }

  async function createDoc() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const pathInput = newPath.trim();
    const folder = pathInput || "general";
    const path = `${folder}/${date}-${slug}.md`;
    const agent = AGENTS.find(a => path.startsWith(a + "/")) ?? "vlad";

    const id = await upsert({
      path, title: newTitle, content: `# ${newTitle}\n\n`,
      agent, board,
    });
    setSelectedId(id as Id<"docs">);
    setNewTitle("");
    setNewPath("");
    setCreating(false);
  }

  let saveTimerRef = saveTimer.current;
  async function handleChange(content: string) {
    if (!selectedId) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimerRef);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)", padding: "0 20px",
        height: "52px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>docs</span>
          <span style={{ color: "var(--border-default)" }}>/</span>
          {(["marketing", "product"] as Board[]).map((b) => (
            <button key={b} onClick={() => { setBoard(b); setSelectedId(null); }}
              style={{
                background: board === b ? "var(--bg-card-elevated)" : "none",
                border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
                borderRadius: "6px", padding: "4px 10px",
                color: board === b ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "13px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
              }}>
              {b}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {selectedDoc && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "●"}
            </span>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{
          width: "240px", minWidth: "240px", borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Filter by owner */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterAgent(null)}
              style={{
                background: filterAgent === null ? "var(--bg-card-elevated)" : "none",
                border: filterAgent === null ? "1px solid var(--border-default)" : "1px solid transparent",
                borderRadius: "5px", padding: "3px 8px", fontSize: "11px", fontWeight: 500,
                color: filterAgent === null ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer",
              }}>All</button>
            {AGENTS.map(a => (
              <button key={a} onClick={() => setFilterAgent(filterAgent === a ? null : a)}
                style={{
                  background: filterAgent === a ? `${AGENT_COLORS[a]}22` : "none",
                  border: filterAgent === a ? `1px solid ${AGENT_COLORS[a]}66` : "1px solid transparent",
                  borderRadius: "5px", padding: "3px 8px", fontSize: "11px", fontWeight: 500,
                  color: filterAgent === a ? AGENT_COLORS[a] : "var(--text-muted)", cursor: "pointer", textTransform: "capitalize",
                }}>{a}</button>
            ))}
          </div>

          {/* New doc */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createDoc(); }}
              placeholder="New document title…"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-default)",
                borderRadius: "6px", padding: "6px 9px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "100%",
              }}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="folder (e.g. maya/research)"
                style={{
                  flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  borderRadius: "6px", padding: "5px 9px", color: "var(--text-secondary)", fontSize: "11px", outline: "none",
                }}
              />
              <button onClick={createDoc} disabled={!newTitle.trim() || creating}
                style={{
                  background: "var(--text-primary)", border: "none", borderRadius: "6px",
                  padding: "5px 10px", color: "var(--bg-app)", fontSize: "13px",
                  cursor: newTitle.trim() ? "pointer" : "not-allowed", opacity: newTitle.trim() ? 1 : 0.4,
                }}>+</button>
            </div>
          </div>

          {/* File tree */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {tree.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                No documents yet
              </div>
            ) : tree.map(node => (
              <TreeItem key={node.path} node={node} depth={0}
                selectedId={selectedId} onSelect={setSelectedId}
                collapsed={collapsed} onToggle={toggleCollapse} />
            ))}
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedDoc ? (
            <>
              <div style={{
                padding: "10px 24px", borderBottom: "1px solid var(--border-subtle)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
              }}>
                <div style={{ flex: 1 }}>
                  {editingTitle ? (
                    <input
                      autoFocus
                      defaultValue={selectedDoc.title}
                      onBlur={(e) => handleTitleSave(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingTitle(false); }}
                      style={{
                        fontSize: "16px", fontWeight: 600, background: "none",
                        border: "none", borderBottom: "1px solid var(--border-default)",
                        color: "var(--text-primary)", outline: "none", width: "100%",
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingTitle(true)}
                      style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", cursor: "text" }}
                    >
                      {selectedDoc.title}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
                    {selectedDoc.path}
                  </div>
                </div>
                <button
                  onClick={async () => { if (confirm("Delete?")) { await remove({ id: selectedDoc._id }); setSelectedId(null); } }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", marginLeft: "16px" }}
                >
                  Delete
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <RichEditor content={selectedDoc.content} onChange={handleChange} placeholder="Start writing…" />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
              Select a document or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
