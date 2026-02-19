"use client";
import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardModal } from "./CardModal";
import { DocPreview } from "./DocPreview";
import { Id } from "@/convex/_generated/dataModel";

type Column = "inbox" | "in-progress" | "review" | "done" | "blocked" | "junk";
type Priority = "low" | "medium" | "high";
type Category = "Marketing" | "Product" | "Idea";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";
type Board = "marketing" | "product";

interface Card {
  _id: Id<"cards">;
  title: string;
  description?: string;
  notes?: string;
  priority: Priority;
  category: Category;
  column: Column;
  board: Board;
  assignee?: Assignee;
  agentNotes?: { agent: string; content: string; createdAt: number }[];
  docPaths?: string[];
  order: number;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#5C8A6C", medium: "#D8973C", high: "#A4243B",
};

const ASSIGNEE_COLORS: Record<Assignee, string> = {
  vlad: "#F5F4F2", aria: "#BD632F", maya: "#A4243B",
  leo: "#D8973C", sage: "#5C8A6C", rex: "#6B8A9C",
};

export function KanbanCard({ card, index }: { card: Card; index: number }) {
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<Id<"docs"> | null>(null);
  const addNote = useMutation(api.cards.addAgentNote);
  const attachDoc = useMutation(api.cards.attachDoc);

  const cardDocs = useQuery(api.docs.byCard, { cardId: card._id }) ?? [];

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    if (!card.assignee || card.assignee === "vlad" || running) return;
    setRunning(true);
    try {
      await addNote({ id: card._id, agent: card.assignee, content: "▶ Starting task…" });
      const res = await fetch("/api/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card._id,
          assignee: card.assignee,
          title: card.title,
          description: card.description,
          board: card.board,
        }),
      });
      const data = await res.json();
      if (data.queued) {
        await addNote({ id: card._id, agent: card.assignee, content: `⚙ Job queued (${data.jobId?.slice(-6)})… runner will pick it up shortly.` });
      } else if (data.error) {
        await addNote({ id: card._id, agent: card.assignee, content: `❌ Failed to queue: ${data.error}` });
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Draggable draggableId={card._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setEditing(true)}
            style={{
              background: snapshot.isDragging ? "var(--bg-card-elevated)" : "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "11px 12px",
              cursor: "pointer",
              userSelect: "none",
              boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
              transform: snapshot.isDragging ? "rotate(1deg)" : "none",
              transition: "box-shadow 0.15s, background 0.15s",
              ...provided.draggableProps.style,
            }}
          >
            {/* Priority bar */}
            <div style={{ height: "2px", borderRadius: "2px", background: PRIORITY_COLORS[card.priority], marginBottom: "9px", opacity: 0.8 }} />

            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "8px" }}>
              {card.title}
            </div>

            {card.description && (
              <div style={{
                fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: "8px",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {card.description}
              </div>
            )}

            {/* Docs attached */}
            {cardDocs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                {cardDocs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={(e) => { e.stopPropagation(); setPreviewDocId(doc._id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "4px 8px", borderRadius: "5px",
                      background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "11px" }}>📄</span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.title}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>↗</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "4px",
                  background: `${PRIORITY_COLORS[card.priority]}18`, color: PRIORITY_COLORS[card.priority], textTransform: "capitalize",
                }}>
                  {card.priority}
                </span>
                {card.assignee && (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
                    background: `${ASSIGNEE_COLORS[card.assignee]}22`, color: ASSIGNEE_COLORS[card.assignee], textTransform: "capitalize",
                  }}>
                    {card.assignee}
                  </span>
                )}
                {(card.agentNotes?.length ?? 0) > 0 && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {card.agentNotes!.length} note{card.agentNotes!.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Run button */}
              {card.assignee && card.assignee !== "vlad" && (
                <button
                  onClick={handleRun}
                  disabled={running}
                  style={{
                    background: running ? "transparent" : `${ASSIGNEE_COLORS[card.assignee]}22`,
                    border: `1px solid ${ASSIGNEE_COLORS[card.assignee]}44`,
                    borderRadius: "5px", padding: "2px 8px",
                    fontSize: "11px", fontWeight: 600,
                    color: ASSIGNEE_COLORS[card.assignee],
                    cursor: running ? "not-allowed" : "pointer",
                    opacity: running ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {running ? "…" : "▶ Run"}
                </button>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {editing && <CardModal card={card} onClose={() => setEditing(false)} />}
      {previewDocId && <DocPreview docId={previewDocId} onClose={() => setPreviewDocId(null)} />}
    </>
  );
}
