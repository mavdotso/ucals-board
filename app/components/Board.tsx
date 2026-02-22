"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { useState, useRef } from "react";
import { CardModal } from "./CardModal";
import { DocIntakeModal } from "./DocIntakeModal";
import { GlobalSearch } from "./GlobalSearch";
import Link from "next/link";

type Column = "inbox" | "in-progress" | "review" | "done" | "blocked" | "junk";
type BoardType = "marketing" | "product";

const COLUMNS: Column[] = ["inbox", "in-progress", "review", "done", "blocked", "junk"];

const AGENTS = [
  { id: "aria", label: "Aria", color: "#BD632F", role: "Strategy" },
  { id: "maya", label: "Maya", color: "#A4243B", role: "Copy" },
  { id: "leo", label: "Leo", color: "#D8973C", role: "Social" },
  { id: "sage", label: "Sage", color: "#5C8A6C", role: "SEO/GEO" },
  { id: "rex", label: "Rex", color: "#6B8A9C", role: "Paid Ads" },
  { id: "vlad", label: "Vlad", color: "#F5F4F2", role: "Founder" },
];

export function Board() {
  const [activeBoard, setActiveBoard] = useState<BoardType>("marketing");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [docDragging, setDocDragging] = useState(false);
  const [docIntake, setDocIntake] = useState<string | null>(null);
  const [searchCardId, setSearchCardId] = useState<string | null>(null);
  const moveCard = useMutation(api.cards.moveCard);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const cards = useQuery(api.cards.listAll, { board: activeBoard }) ?? [];

  const filteredCards = activeAgent
    ? cards.filter((c) => c.assignee === activeAgent)
    : cards;

  const cardsByColumn = COLUMNS.reduce((acc, col) => {
    acc[col] = filteredCards.filter((c) => c.column === col).sort((a, b) => a.order - b.order);
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

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDocDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setDocIntake(content);
    };
    reader.readAsText(file);
  }

  return (
    <div
      ref={dropZoneRef}
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      onDragOver={(e) => { e.preventDefault(); setDocDragging(true); }}
      onDragLeave={() => setDocDragging(false)}
      onDrop={handleFileDrop}
    >
      {/* Drop overlay */}
      {docDragging && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(26,25,24,0.92)",
          border: "2px dashed var(--border-default)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "12px",
        }}>
          <div style={{ fontSize: "32px" }}>📄</div>
          <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>Drop to parse tasks</div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Aria will extract and assign tasks automatically</div>
        </div>
      )}

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
        gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>ucals</span>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          <Link href="/docs" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>docs</Link>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          <Link href="/stack" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>stack</Link>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          <Link href="/calendar" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>calendar</Link>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          <Link href="/board" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>board</Link>
          <span style={{ color: "var(--border-default)", fontSize: "16px" }}>/</span>
          {/* Board tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {(["marketing", "product"] as BoardType[]).map((b) => (
              <button
                key={b}
                onClick={() => setActiveBoard(b)}
                style={{
                  background: activeBoard === b ? "var(--bg-card-elevated)" : "none",
                  border: activeBoard === b ? "1px solid var(--border-default)" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  color: activeBoard === b ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "13px",
                  fontWeight: activeBoard === b ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "center" }}>
          {AGENTS.map((a) => {
            const isActive = activeAgent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setActiveAgent(isActive ? null : a.id)}
                title={`${a.label} — ${a.role}${isActive ? " (click to clear)" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: isActive ? `${a.color}30` : `${a.color}10`,
                  border: `1px solid ${isActive ? a.color : `${a.color}33`}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  outline: "none",
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: a.color, opacity: isActive ? 1 : 0.6 }} />
                <span style={{ fontSize: "11px", fontWeight: isActive ? 700 : 500, color: a.color }}>{a.label}</span>
                <span style={{ fontSize: "10px", color: isActive ? a.color : "var(--text-muted)", opacity: isActive ? 0.8 : 1 }}>{a.role}</span>
              </button>
            );
          })}
          {activeAgent && (
            <button
              onClick={() => setActiveAgent(null)}
              style={{
                fontSize: "11px", color: "var(--text-muted)",
                background: "none", border: "none", cursor: "pointer",
                padding: "3px 6px", borderRadius: "4px",
              }}
            >
              ✕ clear
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <GlobalSearch board={activeBoard} onSelectCard={(id) => setSearchCardId(id as string)} />
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".html,.htm,.md,.txt";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setDocIntake(ev.target?.result as string);
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{
              background: "none",
              border: "1px solid var(--border-default)",
              borderRadius: "7px",
              padding: "6px 12px",
              color: "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
            }}
            title="Import document — Aria will extract and assign tasks"
          >
            Import doc
          </button>
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
        </div>
      </header>

      {/* Board */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "20px 24px" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "flex", gap: "12px", height: "100%", alignItems: "stretch" }}>
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} column={col} cards={cardsByColumn[col]} board={activeBoard} />
            ))}
          </div>
        </DragDropContext>
      </div>

      {adding && <CardModal defaultColumn="inbox" board={activeBoard} onClose={() => setAdding(false)} />}
      {docIntake && <DocIntakeModal content={docIntake} board={activeBoard} onClose={() => setDocIntake(null)} />}
      {searchCardId && (
        <CardModal
          card={cards.find(c => c._id === searchCardId) as any}
          onClose={() => setSearchCardId(null)}
        />
      )}
    </div>
  );
}
