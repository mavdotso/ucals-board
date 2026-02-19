"use client";
import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CardModal } from "./CardModal";
import { Id } from "@/convex/_generated/dataModel";

type Column = "inbox" | "in-progress" | "review" | "done" | "junk";
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
  order: number;
}

const ASSIGNEE_COLORS: Record<Assignee, string> = {
  vlad: "#F5F4F2",
  aria: "#BD632F",
  maya: "#A4243B",
  leo: "#D8973C",
  sage: "#5C8A6C",
  rex: "#6B8A9C",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#5C8A6C",
  medium: "#D8973C",
  high: "#A4243B",
};

const CATEGORY_COLORS: Record<Category, string> = {
  Marketing: "#BD632F",
  Product: "#4A6B78",
  Idea: "#6B6A68",
};

export function KanbanCard({ card, index }: { card: Card; index: number }) {
  const [editing, setEditing] = useState(false);

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
              padding: "12px",
              cursor: "pointer",
              userSelect: "none",
              boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
              transform: snapshot.isDragging ? "rotate(1deg)" : "none",
              transition: "box-shadow 0.15s, background 0.15s",
              ...provided.draggableProps.style,
            }}
          >
            {/* Priority bar */}
            <div style={{
              height: "3px",
              borderRadius: "2px",
              background: PRIORITY_COLORS[card.priority],
              marginBottom: "10px",
              opacity: 0.8,
            }} />

            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "8px" }}>
              {card.title}
            </div>

            {card.description && (
              <div style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.4,
                marginBottom: "8px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {card.description}
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "11px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "4px",
                background: `${PRIORITY_COLORS[card.priority]}18`,
                color: PRIORITY_COLORS[card.priority],
                textTransform: "capitalize",
              }}>
                {card.priority}
              </span>
              {card.assignee && (
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: `${ASSIGNEE_COLORS[card.assignee]}22`,
                  color: ASSIGNEE_COLORS[card.assignee],
                  textTransform: "capitalize",
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
          </div>
        )}
      </Draggable>

      {editing && <CardModal card={card} onClose={() => setEditing(false)} />}
    </>
  );
}
