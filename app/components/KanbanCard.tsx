"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Draggable } from "@hello-pangea/dnd";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardModal } from "./CardModal";
import { DocPreview } from "./DocPreview";
import { CampaignTag } from "./CampaignTag";
import { Id } from "@/convex/_generated/dataModel";

type Column = "inbox" | "in-progress" | "review" | "done" | "blocked" | "junk";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";

const ASSIGNEE_COLORS: Record<Assignee, string> = {
  vlad: "#F5F4F2", aria: "#BD632F", maya: "#A4243B",
  leo: "#D8973C", sage: "#5C8A6C", rex: "#6B8A9C",
};

interface Card {
  _id: Id<"cards">;
  title: string;
  description?: string;
  column: Column;
  assignee?: Assignee;
  docPaths?: string[];
  order: number;
  [key: string]: unknown;
}

export function KanbanCard({ card, index }: { card: Card; index: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<Id<"docs"> | null>(null);

  const cardDocs = useQuery(api.docs.byCard, { cardId: card._id }) ?? [];
  const linkedDocs = useQuery(api.docs.byPaths, { paths: card.docPaths ?? [] }) ?? [];
  const commentCount = useQuery(api.comments.count, { cardId: card._id }) ?? 0;

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
            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "4px" }}>
              {card.title}
            </div>
            <div style={{ marginBottom: "6px" }}>
              <CampaignTag itemId={card._id} />
            </div>

            {card.description && (
              <div style={{
                fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: "8px",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {card.description}
              </div>
            )}

            {/* Docs attached (by cardId) */}
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

            {/* Linked docs (by docPaths) */}
            {linkedDocs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                {linkedDocs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const params = new URLSearchParams();
                      if (doc.folder) params.set("folder", doc.folder);
                      params.set("doc", doc._id);
                      router.push(`/docs?${params.toString()}`);
                    }}
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
                {card.assignee && (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
                    background: `${ASSIGNEE_COLORS[card.assignee]}22`, color: ASSIGNEE_COLORS[card.assignee], textTransform: "capitalize",
                  }}>
                    {card.assignee}
                  </span>
                )}
                {commentCount > 0 && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                    💬 {commentCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {editing && <CardModal card={card} onClose={() => setEditing(false)} />}
      {previewDocId && <DocPreview docId={previewDocId} onClose={() => setPreviewDocId(null)} />}
    </>
  );
}
