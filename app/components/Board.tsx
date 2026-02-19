"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { useState } from "react";
import { CardModal } from "./CardModal";

type Column = "inbox" | "in-progress" | "review" | "done" | "junk";

const COLUMNS: Column[] = ["inbox", "in-progress", "review", "done", "junk"];

export function Board() {
  const cards = useQuery(api.cards.listAll) ?? [];
  const moveCard = useMutation(api.cards.moveCard);
  const [adding, setAdding] = useState(false);

  const cardsByColumn = COLUMNS.reduce((acc, col) => {
    acc[col] = cards
      .filter((c) => c.column === col)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<Column, typeof cards>);

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newColumn = destination.droppableId as Column;
    const destCards = cardsByColumn[newColumn].filter((c) => c._id !== draggableId);
    const newOrder = destination.index === 0
      ? (destCards[0]?.order ?? 0) - 1
      : destination.index >= destCards.length
        ? (destCards[destCards.length - 1]?.order ?? 0) + 1
        : (destCards[destination.index - 1].order + destCards[destination.index].order) / 2;

    await moveCard({ id: draggableId as any, newColumn, newOrder });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>ucals</span>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>board</span>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "var(--text-primary)",
            border: "none",
            borderRadius: "7px",
            padding: "6px 14px",
            color: "var(--bg-app)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New card
        </button>
      </header>

      {/* Board */}
      <div style={{
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        padding: "20px 24px",
      }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{
            display: "flex",
            gap: "12px",
            height: "100%",
            alignItems: "flex-start",
          }}>
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} column={col} cards={cardsByColumn[col]} />
            ))}
          </div>
        </DragDropContext>
      </div>

      {adding && <CardModal onClose={() => setAdding(false)} />}
    </div>
  );
}
