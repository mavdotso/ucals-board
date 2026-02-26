"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DocSheet } from "./DocSheet";

type Column = "inbox" | "in-progress" | "review" | "done" | "blocked" | "junk";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";

interface Card {
  _id: Id<"cards">;
  title: string;
  description?: string;
  column: Column;
  assignee?: Assignee;
  agentNotes?: { agent: string; content: string; createdAt: number }[];
  docPaths?: string[];
  order: number;
  [key: string]: unknown;
}

interface CardModalProps {
  card?: Card;
  defaultColumn?: Column;
  onClose: () => void;
}

const ASSIGNEES: { id: Assignee; label: string; role: string; color: string }[] = [
  { id: "vlad", label: "Vlad", role: "Founder", color: "#F5F4F2" },
  { id: "aria", label: "Aria", role: "Strategy", color: "#BD632F" },
  { id: "maya", label: "Maya", role: "Copy", color: "#A4243B" },
  { id: "leo", label: "Leo", role: "Social", color: "#D8973C" },
  { id: "sage", label: "Sage", role: "SEO/GEO", color: "#5C8A6C" },
  { id: "rex", label: "Rex", role: "Paid Ads", color: "#6B8A9C" },
];

const ASSIGNEE_COLORS: Record<string, string> = Object.fromEntries(ASSIGNEES.map(a => [a.id, a.color]));
const ASSIGNEE_ROLES: Record<string, string> = Object.fromEntries(ASSIGNEES.map(a => [a.id, a.role]));

const COLUMNS: { id: Column; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
  { id: "junk", label: "Junk" },
];

export function CardModal({ card, defaultColumn = "inbox", onClose }: CardModalProps) {
  const create = useMutation(api.cards.create);
  const [sheetDocId, setSheetDocId] = useState<Id<"docs"> | null>(null);
  const update = useMutation(api.cards.update);
  const remove = useMutation(api.cards.remove);
  const linkedDocs = useQuery(api.docs.byPaths, { paths: card?.docPaths ?? [] }) ?? [];
  const comments = useQuery(api.comments.list, card ? { cardId: card._id } : "skip") ?? [];
  const addComment = useMutation(api.comments.add);

  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [column, setColumn] = useState<Column>(card?.column ?? defaultColumn);
  const [assignee, setAssignee] = useState<Assignee | undefined>(card?.assignee);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Build unified activity feed: agentNotes + comments, sorted by time
  const agentNotes = (card?.agentNotes ?? []).map(n => ({
    id: `note-${n.createdAt}`,
    author: n.agent,
    role: "agent" as const,
    content: n.content,
    createdAt: n.createdAt,
  }));
  const commentItems = comments.map(c => ({
    id: c._id,
    author: c.author,
    role: c.role,
    content: c.content,
    createdAt: c.createdAt,
  }));
  const activity = [...agentNotes, ...commentItems].sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity.length]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    if (card) {
      await update({ id: card._id, title, description, column, assignee });
    } else {
      await create({ title, description, column, assignee });
    }
    onClose();
  }

  async function handleDelete() {
    if (!card) return;
    await remove({ id: card._id });
    onClose();
  }

  async function handleSendComment() {
    if (!commentText.trim() || !card || sendingComment) return;
    setSendingComment(true);
    await addComment({ cardId: card._id, author: "vlad", role: "human", content: commentText.trim() });
    setCommentText("");
    setSendingComment(false);

    try {
      await fetch("https://first-viper-528.convex.site/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: "business",
          createdBy: "vlad",
          assignees: ["anya"],
          priority: "high",
          title: `[Comment on: ${card.title.slice(0, 50)}] Review Vlad's note`,
          description: `**Vlad commented on card "${card.title}":**\n\n> ${commentText.trim()}\n\n**Card moved to inbox.** Review and respond.`,
        }),
      });
    } catch {
      // Non-critical
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-card-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "560px",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 500 }}>
            {card ? "Edit card" : "New card"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "8px", padding: "10px 12px", color: "var(--text-primary)",
              fontSize: "15px", fontWeight: 500, outline: "none", width: "100%",
            }}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              borderRadius: "8px", padding: "10px 12px", color: "var(--text-primary)",
              fontSize: "13px", outline: "none", resize: "vertical", width: "100%",
              fontFamily: "inherit", lineHeight: 1.5,
            }}
          />

          {/* Assignee + Stage — side by side */}
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Assignee */}
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assign to</label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {ASSIGNEES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAssignee(assignee === a.id ? undefined : a.id)}
                    title={a.label}
                    style={{
                      padding: "4px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 500, cursor: "pointer",
                      border: assignee === a.id ? `1px solid ${a.color}` : "1px solid var(--border-default)",
                      background: assignee === a.id ? `${a.color}22` : "var(--bg-card)",
                      color: assignee === a.id ? a.color : "var(--text-muted)",
                    }}
                  >
                    {a.role}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div style={{ minWidth: "130px" }}>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stage</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as Column)}
                style={{
                  width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-default)",
                  borderRadius: "6px", padding: "6px 10px", color: "var(--text-primary)",
                  fontSize: "12px", outline: "none",
                }}
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Linked docs */}
          {linkedDocs.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Linked Docs</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {linkedDocs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSheetDocId(doc._id as Id<"docs">)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "8px 10px", borderRadius: "7px",
                      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  >
                    <span style={{ fontSize: "13px", flexShrink: 0 }}>📄</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.path}</div>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>↗</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity thread */}
          {card && (
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Activity {activity.length > 0 && `(${activity.length})`}
              </label>
              {activity.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto", marginBottom: "8px", paddingRight: "4px" }}>
                  {activity.map((item) => {
                    const isHuman = item.role === "human";
                    const color = ASSIGNEE_COLORS[item.author] ?? "var(--text-muted)";
                    const role = ASSIGNEE_ROLES[item.author] ?? item.author;
                    return (
                      <div key={item.id} style={{
                        background: isHuman ? "var(--bg-card)" : `${color}0a`,
                        border: `1px solid ${isHuman ? "var(--border-subtle)" : `${color}22`}`,
                        borderRadius: "7px", padding: "8px 10px",
                        marginLeft: isHuman ? "0" : "12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: isHuman ? "var(--text-primary)" : color }}>
                            {isHuman ? "Vlad" : role}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.content}</div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>
              )}
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Add a comment…"
                  style={{
                    flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)",
                    borderRadius: "6px", padding: "8px 10px", color: "var(--text-primary)",
                    fontSize: "13px", outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || sendingComment}
                  style={{
                    background: commentText.trim() ? "var(--text-primary)" : "var(--bg-card)",
                    border: commentText.trim() ? "none" : "1px solid var(--border-default)",
                    borderRadius: "6px", padding: "8px 14px",
                    color: commentText.trim() ? "var(--bg-app)" : "var(--text-muted)",
                    fontSize: "13px", fontWeight: 600, cursor: commentText.trim() ? "pointer" : "default",
                    flexShrink: 0,
                  }}
                >
                  {sendingComment ? "…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          {card ? (
            <button onClick={handleDelete} style={{
              background: "none", border: "1px solid var(--cranberry)", borderRadius: "8px",
              padding: "8px 16px", color: "var(--cranberry)", fontSize: "13px", cursor: "pointer",
            }}>Delete</button>
          ) : <div />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid var(--border-default)", borderRadius: "8px",
              padding: "8px 16px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={!title.trim() || saving} style={{
              background: "var(--text-primary)", border: "none", borderRadius: "8px",
              padding: "8px 20px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600,
              cursor: title.trim() ? "pointer" : "not-allowed", opacity: title.trim() ? 1 : 0.4,
            }}>{saving ? "Saving…" : card ? "Save" : "Add card"}</button>
          </div>
        </div>
      </div>

      {sheetDocId && <DocSheet docId={sheetDocId} onClose={() => setSheetDocId(null)} />}
    </div>
  );
}
