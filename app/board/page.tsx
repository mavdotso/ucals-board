"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Note = {
  _id: Id<"boardNodes">;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: "yellow" | "blue" | "green" | "pink";
};

const COLORS = {
  yellow: "#FEF3C7",
  blue: "#DBEAFE",
  green: "#D1FAE5",
  pink: "#FCE7F3",
};

export default function BoardPage() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNote, setDraggingNote] = useState<Id<"boardNodes"> | null>(null);
  const [editingNote, setEditingNote] = useState<Id<"boardNodes"> | null>(null);
  const [hoveringNote, setHoveringNote] = useState<Id<"boardNodes"> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const notes = useQuery(api.board.list) ?? [];
  const createNote = useMutation(api.board.create);
  const updateNote = useMutation(api.board.update);
  const deleteNote = useMutation(api.board.remove);

  // Handle wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (canvasRef.current && canvasRef.current.contains(e.target as Node)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.3, Math.min(3, prev * delta)));
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Create note on double-click
  const handleDoubleClick = async (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;
      await createNote({ x, y, content: "", color: "yellow" });
    }
  };

  // Note drag handlers
  const handleNoteDragStart = (e: React.MouseEvent, id: Id<"boardNodes">) => {
    e.stopPropagation();
    setDraggingNote(id);
    const note = notes.find(n => n._id === id);
    if (note) {
      setDragStart({
        x: e.clientX - note.x * scale - offset.x,
        y: e.clientY - note.y * scale - offset.y,
      });
    }
  };

  const handleNoteDragMove = (e: React.MouseEvent) => {
    if (draggingNote) {
      const note = notes.find(n => n._id === draggingNote);
      if (note) {
        const newX = (e.clientX - dragStart.x - offset.x) / scale;
        const newY = (e.clientY - dragStart.y - offset.y) / scale;
        // We'll update on mouse up to avoid too many mutations
      }
    }
  };

  const handleNoteDragEnd = async (e: React.MouseEvent) => {
    if (draggingNote) {
      const newX = (e.clientX - dragStart.x - offset.x) / scale;
      const newY = (e.clientY - dragStart.y - offset.y) / scale;
      await updateNote({ id: draggingNote, x: newX, y: newY });
      setDraggingNote(null);
    }
  };

  // Note edit handlers
  const handleNoteClick = (e: React.MouseEvent, id: Id<"boardNodes">) => {
    e.stopPropagation();
    if (!draggingNote) {
      setEditingNote(id);
    }
  };

  const handleNoteContentChange = async (id: Id<"boardNodes">, content: string) => {
    await updateNote({ id, content });
  };

  const handleNoteColorChange = async (id: Id<"boardNodes">, color: "yellow" | "blue" | "green" | "pink") => {
    await updateNote({ id, color });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
            ucals
          </Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/stack" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>
            stack
          </Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <Link href="/docs" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>
            docs
          </Link>
          <span style={{ color: "var(--border-default)" }}>/</span>
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>board</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)" }}>
          Zoom: {Math.round(scale * 100)}% • Double-click to add note
        </div>
      </header>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-bg"
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleNoteDragMove(e);
        }}
        onMouseUp={(e) => {
          handleMouseUp();
          handleNoteDragEnd(e);
        }}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: isPanning ? "grabbing" : draggingNote ? "move" : "grab",
          background: "var(--bg-app)",
        }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          {notes.map(note => (
            <div
              key={note._id}
              onMouseDown={(e) => handleNoteDragStart(e, note._id)}
              onMouseEnter={() => setHoveringNote(note._id)}
              onMouseLeave={() => setHoveringNote(null)}
              onClick={(e) => handleNoteClick(e, note._id)}
              style={{
                position: "absolute",
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: `${note.width}px`,
                height: `${note.height}px`,
                background: COLORS[note.color as keyof typeof COLORS],
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                padding: "12px",
                cursor: draggingNote === note._id ? "move" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                transition: draggingNote === note._id ? "none" : "box-shadow 0.2s",
              }}
            >
              {/* Note content */}
              {editingNote === note._id ? (
                <textarea
                  autoFocus
                  defaultValue={note.content}
                  onBlur={(e) => {
                    handleNoteContentChange(note._id, e.target.value);
                    setEditingNote(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    color: "#333",
                  }}
                />
              ) : (
                <div
                  style={{
                    flex: 1,
                    fontSize: "13px",
                    color: "#333",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "hidden",
                  }}
                >
                  {note.content || "Double-click to edit"}
                </div>
              )}

              {/* Controls on hover */}
              {hoveringNote === note._id && !editingNote && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-30px",
                    left: "0",
                    display: "flex",
                    gap: "4px",
                    background: "white",
                    padding: "4px",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Color picker */}
                  {(["yellow", "blue", "green", "pink"] as const).map(color => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNoteColorChange(note._id, color);
                      }}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: COLORS[color],
                        border: note.color === color ? "2px solid #333" : "1px solid rgba(0,0,0,0.2)",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote({ id: note._id });
                    }}
                    style={{
                      marginLeft: "8px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}