"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/app/components/Nav";

type NoteColor = "yellow" | "blue" | "green" | "pink";

const COLORS: Record<NoteColor, string> = {
  yellow: "#FEF3C7",
  blue: "#DBEAFE",
  green: "#D1FAE5",
  pink: "#FCE7F3",
};

const NOTE_WIDTH = 200;
const NOTE_HEIGHT = 160;

export default function BoardPage() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: Id<"boardNodes">; startX: number; startY: number; noteStartX: number; noteStartY: number } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [editingNote, setEditingNote] = useState<Id<"boardNodes"> | null>(null);
  const [hoveringNote, setHoveringNote] = useState<Id<"boardNodes"> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const notes = useQuery(api.board.list) ?? [];
  const createNote = useMutation(api.board.create);
  const updateNote = useMutation(api.board.update);
  const deleteNote = useMutation(api.board.remove);

  // Wheel zoom — centered on cursor
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => {
        const next = Math.max(0.2, Math.min(4, prev * delta));
        setOffset(o => ({
          x: mouseX - (mouseX - o.x) * (next / prev),
          y: mouseY - (mouseY - o.y) * (next / prev),
        }));
        return next;
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Global mousemove + mouseup for dragging and panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / scale;
        const dy = (e.clientY - dragging.startY) / scale;
        setLocalPositions(p => ({
          ...p,
          [dragging.id]: { x: dragging.noteStartX + dx, y: dragging.noteStartY + dy },
        }));
      } else if (isPanning) {
        setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    };
    const handleMouseUp = async (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / scale;
        const dy = (e.clientY - dragging.startY) / scale;
        const newX = dragging.noteStartX + dx;
        const newY = dragging.noteStartY + dy;
        await updateNote({ id: dragging.id, x: newX, y: newY });
        setDragging(null);
      }
      setIsPanning(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, isPanning, panStart, scale, updateNote]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.bg === "1") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      setEditingNote(null);
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.bg === "1") {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale - NOTE_WIDTH / 2;
      const y = (e.clientY - rect.top - offset.y) / scale - NOTE_HEIGHT / 2;
      await createNote({ x, y, content: "", color: "yellow" });
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent, note: { _id: Id<"boardNodes">; x: number; y: number }) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({
      id: note._id,
      startX: e.clientX,
      startY: e.clientY,
      noteStartX: localPositions[note._id]?.x ?? note.x,
      noteStartY: localPositions[note._id]?.y ?? note.y,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <Nav active="/board" right={<span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{Math.round(scale * 100)}% · double-click to add · drag to pan</span>} />

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1, position: "relative", overflow: "hidden",
          cursor: isPanning ? "grabbing" : dragging ? "move" : "grab",
          userSelect: "none",
        }}
      >
        {/* Dot grid background */}
        <div data-bg="1" style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
          pointerEvents: "none",
        }} />

        {/* Notes */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}>
          {notes.map(note => {
            const pos = localPositions[note._id] ?? { x: note.x, y: note.y };
            const isEditing = editingNote === note._id;
            const isHovering = hoveringNote === note._id;
            return (
              <div
                key={note._id}
                onMouseDown={(e) => handleNoteMouseDown(e, { ...note, ...pos })}
                onMouseEnter={() => setHoveringNote(note._id)}
                onMouseLeave={() => setHoveringNote(null)}
                onClick={(e) => { e.stopPropagation(); if (!dragging) setEditingNote(note._id); }}
                style={{
                  position: "absolute",
                  left: pos.x, top: pos.y,
                  width: NOTE_WIDTH, height: NOTE_HEIGHT,
                  background: COLORS[note.color as NoteColor] ?? COLORS.yellow,
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: isHovering || isEditing ? "0 4px 16px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.10)",
                  display: "flex", flexDirection: "column",
                  cursor: dragging?.id === note._id ? "move" : "pointer",
                  transition: "box-shadow 0.15s",
                }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    defaultValue={note.content}
                    onBlur={async (e) => {
                      await updateNote({ id: note._id, content: e.target.value });
                      setEditingNote(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      resize: "none", fontSize: "13px", fontFamily: "inherit", color: "#333", lineHeight: 1.5,
                    }}
                  />
                ) : (
                  <div style={{
                    flex: 1, fontSize: "13px", color: "#333", whiteSpace: "pre-wrap",
                    wordBreak: "break-word", overflow: "hidden", lineHeight: 1.5,
                  }}>
                    {note.content || <span style={{ opacity: 0.4 }}>Click to edit…</span>}
                  </div>
                )}

                {/* Controls on hover */}
                {isHovering && !isEditing && (
                  <div
                    style={{
                      position: "absolute", bottom: -36, left: 0,
                      display: "flex", gap: 4, background: "white",
                      padding: "4px 6px", borderRadius: 6,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {(["yellow", "blue", "green", "pink"] as NoteColor[]).map(c => (
                      <button key={c} onClick={(e) => { e.stopPropagation(); updateNote({ id: note._id, color: c }); }} style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: COLORS[c],
                        border: note.color === c ? "2px solid #333" : "1px solid rgba(0,0,0,0.2)",
                        cursor: "pointer", padding: 0,
                      }} />
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); deleteNote({ id: note._id }); }} style={{
                      marginLeft: 6, width: 18, height: 18, borderRadius: 4,
                      background: "#ef4444", color: "white", border: "none",
                      cursor: "pointer", fontSize: 12, fontWeight: "bold",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
