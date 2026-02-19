"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RichEditor } from "@/app/components/editor/RichEditor";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Board = "marketing" | "product";

const AGENT_COLORS: Record<string, string> = {
  aria: "#BD632F", maya: "#A4243B", leo: "#D8973C",
  sage: "#5C8A6C", rex: "#6B8A9C", vlad: "#F5F4F2",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DocsPage() {
  const [board, setBoard] = useState<Board>("marketing");
  const [selectedId, setSelectedId] = useState<Id<"docs"> | null>(null);
  const [newDocAgent, setNewDocAgent] = useState<string>("maya");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const docs = useQuery(api.docs.list, { board }) ?? [];
  const selectedDoc = useQuery(api.docs.get, selectedId ? { id: selectedId } : "skip");
  const upsert = useMutation(api.docs.upsert);
  const save = useMutation(api.docs.save);
  const remove = useMutation(api.docs.remove);

  // Group by agent folder
  const grouped = docs.reduce((acc, doc) => {
    const agent = doc.agent ?? "general";
    if (!acc[agent]) acc[agent] = [];
    acc[agent].push(doc);
    return acc;
  }, {} as Record<string, typeof docs>);

  async function createDoc() {
    if (!newDocTitle.trim()) return;
    setCreating(true);
    const slug = newDocTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const path = `${newDocAgent}/${date}-${slug}.md`;
    const id = await upsert({
      path, title: newDocTitle, content: `# ${newDocTitle}\n\n`,
      agent: newDocAgent, board,
    });
    setSelectedId(id as Id<"docs">);
    setNewDocTitle("");
    setCreating(false);
  }

  let saveTimer: ReturnType<typeof setTimeout>;
  async function handleChange(content: string) {
    if (!selectedId) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      setSaveStatus("saving");
      await save({ id: selectedId, content });
      setSaveStatus("saved");
    }, 1000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)", padding: "0 20px",
        height: "52px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "var(--bg-secondary)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>docs</span>
          <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
            {(["marketing", "product"] as Board[]).map((b) => (
              <button key={b} onClick={() => { setBoard(b); setSelectedId(null); }}
                style={{
                  background: board === b ? "var(--bg-card-elevated)" : "none",
                  border: board === b ? "1px solid var(--border-default)" : "1px solid transparent",
                  borderRadius: "6px", padding: "4px 12px",
                  color: board === b ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "13px", fontWeight: board === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
                }}>
                {b}
              </button>
            ))}
          </div>
        </div>
        {selectedDoc && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved changes"}
          </span>
        )}
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{
          width: "220px", minWidth: "220px", borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* New doc */}
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <select value={newDocAgent} onChange={(e) => setNewDocAgent(e.target.value)}
                style={{
                  flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  borderRadius: "6px", padding: "5px 8px", color: "var(--text-primary)", fontSize: "12px", outline: "none",
                }}>
                {["aria", "maya", "leo", "sage", "rex", "vlad"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createDoc(); }}
                placeholder="New document…"
                style={{
                  flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  borderRadius: "6px", padding: "5px 8px", color: "var(--text-primary)", fontSize: "12px", outline: "none",
                }}
              />
              <button onClick={createDoc} disabled={!newDocTitle.trim() || creating}
                style={{
                  background: "var(--text-primary)", border: "none", borderRadius: "6px",
                  padding: "5px 10px", color: "var(--bg-app)", fontSize: "13px", cursor: "pointer",
                }}>+</button>
            </div>
          </div>

          {/* File tree */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {Object.entries(grouped).sort().map(([agent, agentDocs]) => (
              <div key={agent}>
                <div style={{
                  padding: "6px 14px 4px",
                  fontSize: "11px", fontWeight: 600, color: AGENT_COLORS[agent] ?? "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {agent}
                </div>
                {agentDocs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSelectedId(doc._id)}
                    style={{
                      padding: "6px 14px",
                      cursor: "pointer",
                      background: selectedId === doc._id ? "var(--bg-card)" : "none",
                      borderLeft: selectedId === doc._id ? `2px solid ${AGENT_COLORS[agent] ?? "var(--border-default)"}` : "2px solid transparent",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {docs.length === 0 && (
              <div style={{ padding: "20px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                No documents yet
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedDoc ? (
            <>
              <div style={{
                padding: "12px 24px", borderBottom: "1px solid var(--border-subtle)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{selectedDoc.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{selectedDoc.path}</div>
                </div>
                <button
                  onClick={async () => { if (confirm("Delete this document?")) { await remove({ id: selectedDoc._id }); setSelectedId(null); } }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}
                >
                  Delete
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <RichEditor
                  content={selectedDoc.content}
                  onChange={handleChange}
                  placeholder="Start writing…"
                />
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
