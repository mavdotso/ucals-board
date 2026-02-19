"use client";
import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { KanbanCard } from "./KanbanCard";
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

const COLUMN_LABELS: Record<Column, string> = {
  "inbox": "Inbox",
  "in-progress": "In Progress",
  "review": "Review",
  "done": "Done",
  "junk": "Junk",
};

const COLUMN_ACCENT: Record<Column, string> = {
  "inbox": "#A5A4A0",
  "in-progress": "#D8973C",
  "review": "#6B8A9C",
  "done": "#5C8A6C",
  "junk": "#6B6A68",
};

export function KanbanColumn({ column, cards }: { column: Column; cards: Card[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "260px",
      minWidth: "260px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "10px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: COLUMN_ACCENT[column],
          }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {COLUMN_LABELS[column]}
          </span>
          <span style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1px 7px",
          }}>
            {cards.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            padding: "0 2px",
            display: "flex",
            alignItems: "center",
          }}
          title="Add card"
        >
          +
        </button>
      </div>

      {/* Cards */}
      <Droppable droppableId={column}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flex: 1,
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minHeight: "80px",
              background: snapshot.isDraggingOver ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "background 0.15s",
            }}
          >
            {cards.map((card, index) => (
              <KanbanCard key={card._id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding && <CardModal defaultColumn={column} onClose={() => setAdding(false)} />}
    </div>
  );
}
