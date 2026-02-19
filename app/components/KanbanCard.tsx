"use client";
import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CardModal } from "./CardModal";
import { Id } from "@/convex/_generated/dataModel";

type Column = "inbox" | "in-progress" | "review" | "done" | "junk";
type Priority = "low" | "medium" | "high";
type Category = "Marketing" | "Product" | "Idea";

interface Card {
  _id: Id<"cards">;
  title: string;
  description?: string;
  notes?: string;
  priority: Priority;
  category: Category;
  column: Column;
  order: number;
}

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

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{
                fontSize: "11px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "4px",
                background: `${CATEGORY_COLORS[card.category]}22`,
                color: CATEGORY_COLORS[card.category],
                border: `1px solid ${CATEGORY_COLORS[card.category]}44`,
              }}>
                {card.category}
              </span>
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
            </div>
          </div>
        )}
      </Draggable>

      {editing && <CardModal card={card} onClose={() => setEditing(false)} />}
    </>
  );
}
