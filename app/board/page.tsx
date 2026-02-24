"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/app/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

type NoteColor = "yellow" | "blue" | "green" | "pink";
type Tool = "select" | "hand" | "note";

interface BoardNode {
  _id: Id<"boardNodes">;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: NoteColor;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTE_COLORS: Record<NoteColor, string> = {
  yellow: "#FEF3C7",
  blue: "#DBEAFE",
  green: "#D1FAE5",
  pink: "#FCE7F3",
};

const NOTE_TEXT_COLORS: Record<NoteColor, string> = {
  yellow: "#92400E",
  blue: "#1E40AF",
  green: "#065F46",
  pink: "#9D174D",
};

const DOT_GRID = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='%233A3937'/%3E%3C/svg%3E")`;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const nodes = useQuery(api.board.list) ?? [];
  const createNode = useMutation(api.board.create);
  const updateNode = useMutation(api.board.update);
  const deleteNode = useMutation(api.board.remove);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, _setTool] = useState<Tool>("select");
  const toolRef = useRef<Tool>("select");
  const setTool = (t: Tool) => { toolRef.current = t; _setTool(t); };

  const [selectedId, setSelectedId] = useState<Id<"boardNodes"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"boardNodes"> | null>(null);
  const [noteColor, setNoteColor] = useState<NoteColor>("yellow");

  // Dragging
  const [dragId, setDragId] = useState<Id<"boardNodes"> | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // Panning
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceRef = useRef(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const toCanvas = useCallback((sx: number, sy: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (sx - r.left - offset.x) / scale, y: (sy - r.top - offset.y) / scale };
  }, [offset, scale]);

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.08 : 0.92;
      setScale(prev => {
        const next = Math.max(0.1, Math.min(5, prev * f));
        setOffset(o => ({
          x: mx - (mx - o.x) * (next / prev),
          y: my - (my - o.y) * (next / prev),
        }));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      if (e.code === "Space") { spaceRef.current = true; e.preventDefault(); return; }
      if (e.key === "v" || e.key === "V") { setTool("select"); return; }
      if (e.key === "h" || e.key === "H") { setTool("hand"); return; }
      if (e.key === "n" || e.key === "N") { setTool("note"); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteNode({ id: selectedId });
        setSelectedId(null);
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
        setTool("select");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [selectedId, deleteNode]);

  // ─── Focus textarea ───────────────────────────────────────────────────────

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingId]);

  // ─── Canvas mouse ─────────────────────────────────────────────────────────

  const onCanvasDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // Pan
    if (spaceRef.current || toolRef.current === "hand") {
      setIsPanning(true);
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    // Note tool — create note immediately
    if (toolRef.current === "note") {
      const cp = toCanvas(e.clientX, e.clientY);
      createNode({ x: cp.x - 100, y: cp.y - 75, content: "", color: noteColor }).then(id => {
        setSelectedId(id);
        setEditingId(id);
        setTool("select");
      });
      return;
    }

    // Select tool — click on blank = deselect
    setSelectedId(null);
    setEditingId(null);
  }, [offset, toCanvas, createNode, noteColor]);

  const onCanvasMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }
    if (dragId && dragPos) {
      const cp = toCanvas(e.clientX, e.clientY);
      setDragPos({ x: cp.x - dragOffset.dx, y: cp.y - dragOffset.dy });
    }
  }, [isPanning, dragId, dragPos, dragOffset, toCanvas]);

  const onCanvasUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return; }
    if (dragId && dragPos) {
      updateNode({ id: dragId, x: dragPos.x, y: dragPos.y });
      setDragId(null);
      setDragPos(null);
    }
  }, [isPanning, dragId, dragPos, updateNode]);

  // ─── Node handlers ────────────────────────────────────────────────────────

  const onNoteDown = useCallback((e: React.MouseEvent, node: BoardNode) => {
    if (editingId === node._id) return;
    e.stopPropagation();
    if (spaceRef.current || toolRef.current === "hand") return;
    setSelectedId(node._id);
    const cp = toCanvas(e.clientX, e.clientY);
    setDragId(node._id);
    setDragOffset({ dx: cp.x - node.x, dy: cp.y - node.y });
    setDragPos({ x: node.x, y: node.y });
  }, [editingId, toCanvas]);

  const onNoteDblClick = useCallback((e: React.MouseEvent, node: BoardNode) => {
    e.stopPropagation();
    setSelectedId(node._id);
    setEditingId(node._id);
  }, []);

  const onTextSave = useCallback((node: BoardNode, val: string) => {
    updateNode({ id: node._id, content: val });
    setEditingId(null);
  }, [updateNode]);

  // ─── Cursor ───────────────────────────────────────────────────────────────

  const cursor = isPanning || spaceRef.current ? "grabbing" : tool === "hand" ? "grab" : tool === "note" ? "crosshair" : "default";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/board" right={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Tool picker */}
          {(["select", "hand", "note"] as Tool[]).map(t => (
            <button
              key={t}
              onClick={() => setTool(t)}
              title={t === "select" ? "Select (V)" : t === "hand" ? "Hand (H)" : "Note (N)"}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: tool === t ? "var(--bg-card-elevated)" : "transparent",
                border: tool === t ? "1px solid var(--border-default)" : "1px solid transparent",
                color: tool === t ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {t === "select" ? "↖ Select" : t === "hand" ? "✋ Hand" : "📝 Note"}
            </button>
          ))}

          {/* Color picker for note tool */}
          {tool === "note" && (
            <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
                <button
                  key={c}
                  onClick={() => setNoteColor(c)}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: NOTE_COLORS[c],
                    border: noteColor === c ? "2px solid var(--text-primary)" : "1px solid var(--border-default)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}

          {/* Zoom */}
          <div style={{ display: "flex", gap: 3, marginLeft: 8 }}>
            <ZoomBtn onClick={() => setScale(s => Math.min(5, s * 1.2))}>+</ZoomBtn>
            <ZoomBtn onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} wide>{Math.round(scale * 100)}%</ZoomBtn>
            <ZoomBtn onClick={() => setScale(s => Math.max(0.1, s / 1.2))}>−</ZoomBtn>
          </div>
        </div>
      } />

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={onCanvasDown}
        onMouseMove={onCanvasMove}
        onMouseUp={onCanvasUp}
        onMouseLeave={onCanvasUp}
        style={{
          flex: 1, position: "relative", overflow: "hidden", cursor,
          backgroundImage: DOT_GRID,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
      >
        <div style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0", position: "absolute",
        }}>
          {(nodes as BoardNode[]).map(node => {
            const isEditing = editingId === node._id;
            const isSelected = selectedId === node._id;
            const isDragging = dragId === node._id;
            const x = isDragging && dragPos ? dragPos.x : node.x;
            const y = isDragging && dragPos ? dragPos.y : node.y;
            const bg = NOTE_COLORS[(node.color as NoteColor) || "yellow"];
            const fg = NOTE_TEXT_COLORS[(node.color as NoteColor) || "yellow"];

            return (
              <div
                key={node._id}
                onMouseDown={(e) => onNoteDown(e, node)}
                onDoubleClick={(e) => onNoteDblClick(e, node)}
                style={{
                  position: "absolute", left: x, top: y,
                  width: node.width, height: node.height,
                  background: bg,
                  border: isSelected ? "2px solid #3B82F6" : "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 6,
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(59,130,246,0.25), 0 4px 16px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.12)",
                  cursor: isEditing ? "text" : "grab",
                  display: "flex", flexDirection: "column",
                  overflow: "hidden", userSelect: isEditing ? "text" : "none",
                  transition: isDragging ? "none" : "box-shadow 0.15s",
                }}
              >
                {/* Top accent bar */}
                <div style={{ height: 3, background: "rgba(0,0,0,0.06)", flexShrink: 0 }} />

                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    defaultValue={node.content || ""}
                    onBlur={(e) => onTextSave(node, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") onTextSave(node, (e.target as HTMLTextAreaElement).value);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      resize: "none", padding: "10px 12px", fontSize: 13,
                      fontFamily: "inherit", color: fg, lineHeight: 1.5,
                    }}
                  />
                ) : (
                  <div style={{
                    flex: 1, padding: "10px 12px", fontSize: 13,
                    color: fg, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    overflow: "hidden", lineHeight: 1.5, pointerEvents: "none",
                  }}>
                    {node.content || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
                  </div>
                )}

                {/* Bottom: color picker + delete when selected */}
                {isSelected && !isEditing && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      display: "flex", gap: 4, padding: "5px 10px",
                      background: "rgba(0,0,0,0.04)", flexShrink: 0,
                      alignItems: "center",
                    }}
                  >
                    {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
                      <button
                        key={c}
                        onClick={() => updateNode({ id: node._id, color: c })}
                        style={{
                          width: 14, height: 14, borderRadius: "50%",
                          background: NOTE_COLORS[c],
                          border: node.color === c ? "2px solid rgba(0,0,0,0.4)" : "1px solid rgba(0,0,0,0.15)",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                    <button
                      onClick={() => { deleteNode({ id: node._id }); setSelectedId(null); }}
                      style={{
                        marginLeft: "auto", background: "#ef4444", border: "none",
                        color: "white", borderRadius: 3, cursor: "pointer",
                        fontSize: 11, padding: "1px 6px", lineHeight: "16px",
                      }}
                    >✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Blank canvas</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Press N then click to place a note. Space+drag to pan. Scroll to zoom.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ZoomBtn({ onClick, children, wide }: { onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: "var(--bg-card-elevated)",
      border: "1px solid var(--border-default)",
      borderRadius: 5, color: "var(--text-secondary)",
      cursor: "pointer", fontSize: wide ? 11 : 14, fontWeight: 600,
      width: wide ? 44 : 28, height: 26,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{children}</button>
  );
}
