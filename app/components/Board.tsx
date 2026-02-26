"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { useState, useRef } from "react";
import { CardModal } from "./CardModal";
import { DocIntakeModal } from "./DocIntakeModal";
import { GlobalSearch } from "./GlobalSearch";
import { Nav } from "@/app/components/Nav";
import { useCampaign } from "./CampaignContext";

type Column = "inbox" | "in-progress" | "review" | "done" | "blocked" | "junk";

const COLUMNS: Column[] = ["inbox", "in-progress", "review", "blocked", "done", "junk"];

const AGENTS = [
  { id: "aria", label: "Aria", color: "#BD632F" },
  { id: "maya", label: "Maya", color: "#A4243B" },
  { id: "leo", label: "Leo", color: "#D8973C" },
  { id: "sage", label: "Sage", color: "#5C8A6C" },
  { id: "rex", label: "Rex", color: "#6B8A9C" },
  { id: "vlad", label: "Vlad", color: "#F5F4F2" },
];

export function Board() {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [docDragging, setDocDragging] = useState(false);
  const [docIntake, setDocIntake] = useState<string | null>(null);
  const [searchCardId, setSearchCardId] = useState<string | null>(null);
  const moveCard = useMutation(api.cards.moveCard);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { activeCampaignId, itemMatchesCampaign } = useCampaign();

  const cards = useQuery(api.cards.listAll) ?? [];

  const filteredCards = cards
    .filter((c) => !activeAgent || c.assignee === activeAgent)
    .filter((c) => itemMatchesCampaign(c._id, activeCampaignId));

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

      <Nav active="/" right={<>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", padding: "4px 12px" }}>Marketing</span>
        <span style={{ color: "var(--border-default)" }}>|</span>
        {AGENTS.map((a) => {
          const isActive = activeAgent === a.id;
          return (
            <button key={a.id} onClick={() => setActiveAgent(isActive ? null : a.id)}
              style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "6px",
                background: isActive ? `${a.color}30` : `${a.color}10`,
                border: `1px solid ${isActive ? a.color : `${a.color}33`}`,
                cursor: "pointer", outline: "none",
              }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: a.color, opacity: isActive ? 1 : 0.6 }} />
              <span style={{ fontSize: "11px", fontWeight: isActive ? 700 : 500, color: a.color }}>{a.label}</span>
            </button>
          );
        })}
        {activeAgent && <button onClick={() => setActiveAgent(null)} style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
        <span style={{ color: "var(--border-default)" }}>|</span>
        <GlobalSearch onSelectCard={(id) => setSearchCardId(id as string)} />
        <button onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".html,.htm,.md,.txt"; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setDocIntake(ev.target?.result as string); reader.readAsText(file); }; input.click(); }} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "7px", padding: "6px 12px", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>
          Import doc
        </button>
        <button onClick={() => setAdding(true)} style={{ background: "var(--text-primary)", border: "none", borderRadius: "7px", padding: "6px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          + New card
        </button>
      </>} />

      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "20px 24px" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "flex", gap: "12px", height: "100%", alignItems: "stretch" }}>
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} column={col} cards={cardsByColumn[col]} />
            ))}
          </div>
        </DragDropContext>
      </div>

      {adding && <CardModal defaultColumn="inbox" onClose={() => setAdding(false)} />}
      {docIntake && <DocIntakeModal content={docIntake} onClose={() => setDocIntake(null)} />}
      {searchCardId && (
        <CardModal
          card={cards.find(c => c._id === searchCardId) as any}
          onClose={() => setSearchCardId(null)}
        />
      )}
    </div>
  );
}
