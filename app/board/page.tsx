"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = "note" | "text" | "rect" | "ellipse" | "arrow";
type NoteColor = "yellow" | "blue" | "green" | "pink" | "white" | "gray";
type Tool = "select" | "hand" | "note" | "text" | "rect" | "ellipse" | "arrow";

interface BoardNode {
  _id: Id<"boardNodes">;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: NoteColor;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  x2?: number;
  y2?: number;
  fontSize?: number;
}

interface HistoryEntry {
  nodes: BoardNode[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTE_COLORS: Record<NoteColor, string> = {
  yellow: "#FEF3C7",
  blue: "#DBEAFE",
  green: "#D1FAE5",
  pink: "#FCE7F3",
  white: "#F9FAFB",
  gray: "#374151",
};

const NOTE_TEXT_COLORS: Record<NoteColor, string> = {
  yellow: "#1c1a00",
  blue: "#1e1a3f",
  green: "#052e16",
  pink: "#4a0020",
  white: "#111827",
  gray: "#F9FAFB",
};

const TOOL_KEYS: Record<string, Tool> = {
  v: "select", s: "select",
  h: "hand",
  n: "note",
  t: "text",
  r: "rect",
  e: "ellipse",
  l: "arrow", a: "arrow",
};

const TOOL_LABELS: Record<Tool, string> = {
  select: "Select (V)",
  hand: "Hand (H)",
  note: "Note (N)",
  text: "Text (T)",
  rect: "Rectangle (R)",
  ellipse: "Ellipse (E)",
  arrow: "Arrow (A)",
};

const TOOL_ICONS: Record<Tool, string> = {
  select: "↖",
  hand: "✋",
  note: "📝",
  text: "T",
  rect: "▭",
  ellipse: "◯",
  arrow: "↗",
};

// ─── Dot grid background ─────────────────────────────────────────────────────
const DOT_GRID_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='%233A3937'/%3E%3C/svg%3E`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BoardPage() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, setToolState] = useState<Tool>("select");
  const toolRef = useRef<Tool>("select");
  const setTool = useCallback((t: Tool) => { toolRef.current = t; setToolState(t); }, []);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"boardNodes">>>(new Set());
  const [editingId, setEditingId] = useState<Id<"boardNodes"> | null>(null);

  // Dragging nodes
  const [dragging, setDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartNodePositions = useRef<Map<Id<"boardNodes">, { x: number; y: number }>>(new Map());

  // Resizing
  const [resizing, setResizing] = useState<{ id: Id<"boardNodes">; handle: string } | null>(null);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 });

  // Panning
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  // Rubber-band selection
  const [selecting, setSelecting] = useState(false);
  const selectionStart = useRef({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Drawing new shape
  const [drawing, setDrawing] = useState(false);
  const drawStart = useRef({ x: 0, y: 0 });
  const drawingToolRef = useRef<Tool>("note");
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Undo/Redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);

  // Optimistic local positions (for smooth drag)
  const [localPositions, setLocalPositions] = useState<Map<Id<"boardNodes">, { x: number; y: number }>>(new Map());

  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const nodes = useQuery(api.board.list) ?? [];
  const createNode = useMutation(api.board.create);
  const updateNode = useMutation(api.board.update);
  const deleteNode = useMutation(api.board.remove);
  const deleteManyNodes = useMutation(api.board.removeMany);

  // Push to undo history when nodes change from server
  const nodesRef = useRef<BoardNode[]>([]);
  useEffect(() => {
    nodesRef.current = nodes as BoardNode[];
  }, [nodes]);

  // ─── Coordinate helpers ───────────────────────────────────────────────────

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - offset.x) / scale,
      y: (sy - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!canvasRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setScale(prev => {
        const next = Math.max(0.1, Math.min(5, prev * factor));
        setOffset(off => ({
          x: mouseX - (mouseX - off.x) * (next / prev),
          y: mouseY - (mouseY - off.y) * (next / prev),
        }));
        return next;
      });
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = tag === "textarea" || tag === "input" || (e.target as HTMLElement).isContentEditable;

      if (e.code === "Space" && !isInput) {
        spaceHeld.current = true;
        e.preventDefault();
      }

      if (!isInput) {
        // Tool shortcuts
        const t = TOOL_KEYS[e.key.toLowerCase()];
        if (t && !e.metaKey && !e.ctrlKey) {
          setTool(t);
          return;
        }

        // Delete
        if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
          e.preventDefault();
          const ids = [...selectedIds] as Id<"boardNodes">[];
          deleteManyNodes({ ids });
          setSelectedIds(new Set());
          return;
        }

        // Select all
        if ((e.metaKey || e.ctrlKey) && e.key === "a") {
          e.preventDefault();
          setSelectedIds(new Set(nodes.map(n => n._id)));
          return;
        }

        // Undo
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
          e.preventDefault();
          // Basic: just deselect (full undo needs optimistic store)
          setSelectedIds(new Set());
          return;
        }

        // Escape
        if (e.key === "Escape") {
          setSelectedIds(new Set());
          setEditingId(null);
          if (tool !== "select") setTool("select");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selectedIds, nodes, tool, deleteManyNodes]);

  // ─── Focus textarea when editing ─────────────────────────────────────────

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  // ─── Canvas mouse down ────────────────────────────────────────────────────

  const getNodeAt = useCallback((cx: number, cy: number): BoardNode | null => {
    // Iterate in reverse (top-most first)
    const arr = [...(nodes as BoardNode[])].reverse();
    for (const node of arr) {
      const pos = localPositions.get(node._id);
      const nx = pos?.x ?? node.x;
      const ny = pos?.y ?? node.y;
      if (node.type === "arrow") {
        // Hit test line
        const x2 = node.x2 ?? nx + node.width;
        const y2 = node.y2 ?? ny + node.height;
        const dx = x2 - nx, dy = y2 - ny;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const t = ((cx - nx) * dx + (cy - ny) * dy) / (len * len);
        const clampedT = Math.max(0, Math.min(1, t));
        const projX = nx + clampedT * dx;
        const projY = ny + clampedT * dy;
        if (Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2) < 8) return node;
      } else {
        if (cx >= nx && cx <= nx + node.width && cy >= ny && cy <= ny + node.height) return node;
      }
    }
    return null;
  }, [nodes, localPositions]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const isPan = spaceHeld.current || tool === "hand";

    if (isPan) {
      setPanning(true);
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    const cp = screenToCanvas(e.clientX, e.clientY);

    if (tool === "select") {
      const hit = getNodeAt(cp.x, cp.y);
      if (hit) {
        // Don't start drag here — let node handler do it
        return;
      }
      // Rubber-band
      setSelecting(true);
      selectionStart.current = { x: cp.x, y: cp.y };
      setSelectionRect({ x: cp.x, y: cp.y, w: 0, h: 0 });
      setSelectedIds(new Set());
      return;
    }

    // Drawing tools
    const currentTool = toolRef.current;
    if (["note", "text", "rect", "ellipse", "arrow"].includes(currentTool)) {
      setDrawing(true);
      drawingToolRef.current = currentTool;
      drawStart.current = { x: cp.x, y: cp.y };
      setDrawRect({ x: cp.x, y: cp.y, w: 0, h: 0 });
    }
  }, [tool, offset, screenToCanvas, getNodeAt]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }

    if (dragging && dragStartNodePositions.current.size > 0) {
      const dx = (e.clientX - dragStartPos.current.x) / scale;
      const dy = (e.clientY - dragStartPos.current.y) / scale;
      const newPositions = new Map<Id<"boardNodes">, { x: number; y: number }>();
      dragStartNodePositions.current.forEach((start, id) => {
        newPositions.set(id, { x: start.x + dx, y: start.y + dy });
      });
      setLocalPositions(newPositions);
      return;
    }

    if (resizing) {
      const { id, handle } = resizing;
      const node = (nodes as BoardNode[]).find(n => n._id === id);
      if (!node) return;
      const { mouseX, mouseY, x, y, w, h } = resizeStartRef.current;
      const dx = (e.clientX - mouseX) / scale;
      const dy = (e.clientY - mouseY) / scale;
      let nx = x, ny = y, nw = w, nh = h;
      if (handle.includes("e")) nw = Math.max(40, w + dx);
      if (handle.includes("s")) nh = Math.max(30, h + dy);
      if (handle.includes("w")) { nx = x + dx; nw = Math.max(40, w - dx); }
      if (handle.includes("n")) { ny = y + dy; nh = Math.max(30, h - dy); }
      updateNode({ id, x: nx, y: ny, width: nw, height: nh });
      return;
    }

    if (selecting) {
      const cp = screenToCanvas(e.clientX, e.clientY);
      const sx = selectionStart.current.x;
      const sy = selectionStart.current.y;
      setSelectionRect({
        x: Math.min(sx, cp.x),
        y: Math.min(sy, cp.y),
        w: Math.abs(cp.x - sx),
        h: Math.abs(cp.y - sy),
      });
      return;
    }

    if (drawing) {
      const cp = screenToCanvas(e.clientX, e.clientY);
      const sx = drawStart.current.x;
      const sy = drawStart.current.y;
      if (drawingToolRef.current === "arrow") {
        setDrawRect({ x: sx, y: sy, w: cp.x - sx, h: cp.y - sy });
      } else {
        setDrawRect({
          x: Math.min(sx, cp.x),
          y: Math.min(sy, cp.y),
          w: Math.abs(cp.x - sx),
          h: Math.abs(cp.y - sy),
        });
      }
    }
  }, [panning, dragging, resizing, selecting, drawing, scale, nodes, screenToCanvas, updateNode, tool]);

  const handleCanvasMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (panning) { setPanning(false); return; }

    if (dragging) {
      // Commit positions to Convex
      const updates: Promise<unknown>[] = [];
      localPositions.forEach((pos, id) => {
        updates.push(updateNode({ id, x: pos.x, y: pos.y }));
      });
      await Promise.all(updates);
      setLocalPositions(new Map());
      setDragging(false);
      dragStartNodePositions.current.clear();
      return;
    }

    if (resizing) {
      setResizing(null);
      return;
    }

    if (selecting) {
      setSelecting(false);
      if (selectionRect && (selectionRect.w > 4 || selectionRect.h > 4)) {
        const { x, y, w, h } = selectionRect;
        const ids = new Set<Id<"boardNodes">>();
        (nodes as BoardNode[]).forEach(node => {
          const np = localPositions.get(node._id);
          const nx = np?.x ?? node.x;
          const ny = np?.y ?? node.y;
          if (nx < x + w && nx + node.width > x && ny < y + h && ny + node.height > y) {
            ids.add(node._id);
          }
        });
        setSelectedIds(ids);
      }
      setSelectionRect(null);
      return;
    }

    if (drawing) {
      setDrawing(false);
      const rect = drawRect;
      setDrawRect(null);
      if (!rect) return;

      const drawTool = drawingToolRef.current;
      const minSize = 10;
      let { x, y, w, h } = rect;

      if (drawTool === "arrow") {
        const id = await createNode({
          type: "arrow",
          x, y, width: 0, height: 0,
          x2: x + w, y2: y + h,
          strokeColor: "#6B6A68",
          strokeWidth: 2,
        });
        setSelectedIds(new Set([id]));
        setTool("select");
        return;
      }

      // For small clicks (no drag), use default size
      if (w < minSize) w = drawTool === "note" ? 200 : drawTool === "text" ? 200 : 160;
      if (h < minSize) h = drawTool === "note" ? 150 : drawTool === "text" ? 50 : 100;

      const colorMap: Record<string, NoteColor | undefined> = {
        note: "yellow",
        text: undefined,
        rect: undefined,
        ellipse: undefined,
        arrow: undefined,
      };

      const id = await createNode({
        type: drawTool as NodeType,
        x, y, width: w, height: h,
        color: colorMap[drawTool],
        content: "",
        strokeColor: drawTool === "rect" || drawTool === "ellipse" ? "#6B6A68" : undefined,
        fillColor: drawTool === "rect" || drawTool === "ellipse" ? "transparent" : undefined,
        strokeWidth: drawTool === "rect" || drawTool === "ellipse" ? 2 : undefined,
      });

      setSelectedIds(new Set([id]));
      if (drawTool === "note" || drawTool === "text") {
        setEditingId(id);
      }
      setTool("select");
    }
  }, [panning, dragging, resizing, selecting, drawing, localPositions, nodes, selectionRect, drawRect, tool, updateNode, createNode]);

  // ─── Node interaction ─────────────────────────────────────────────────────

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: BoardNode) => {
    if (editingId === node._id) return;
    e.stopPropagation();

    const isPan = spaceHeld.current || tool === "hand";
    if (isPan) return;

    if (tool === "select") {
      // Select
      if (!e.shiftKey) {
        if (!selectedIds.has(node._id)) setSelectedIds(new Set([node._id]));
      } else {
        const next = new Set(selectedIds);
        if (next.has(node._id)) next.delete(node._id); else next.add(node._id);
        setSelectedIds(next);
      }

      // Start drag
      setDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      const positions = new Map<Id<"boardNodes">, { x: number; y: number }>();
      const idsToMove = new Set(selectedIds);
      if (!selectedIds.has(node._id)) idsToMove.add(node._id);
      idsToMove.forEach(id => {
        const n = (nodes as BoardNode[]).find(nn => nn._id === id);
        if (n) {
          const lp = localPositions.get(id);
          positions.set(id, { x: lp?.x ?? n.x, y: lp?.y ?? n.y });
        }
      });
      dragStartNodePositions.current = positions;
    }
  }, [editingId, tool, selectedIds, nodes, localPositions]);

  const handleNodeClick = useCallback((e: React.MouseEvent, node: BoardNode) => {
    e.stopPropagation();
    if (tool === "select") {
      if (!e.shiftKey) setSelectedIds(new Set([node._id]));
    }
  }, [tool]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: BoardNode) => {
    e.stopPropagation();
    if (node.type === "note" || node.type === "text" || node.type === "rect" || node.type === "ellipse") {
      setEditingId(node._id);
      setSelectedIds(new Set([node._id]));
    }
  }, []);

  const handleTextBlur = useCallback((node: BoardNode, value: string) => {
    updateNode({ id: node._id, content: value });
    setEditingId(null);
  }, [updateNode]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, node: BoardNode, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({ id: node._id, handle });
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: node.x,
      y: node.y,
      w: node.width,
      h: node.height,
    };
  }, []);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const getNodePos = (node: BoardNode) => {
    const lp = localPositions.get(node._id);
    return { x: lp?.x ?? node.x, y: lp?.y ?? node.y };
  };

  const isSelected = (id: Id<"boardNodes">) => selectedIds.has(id);

  const renderResizeHandles = (node: BoardNode) => {
    const { x, y } = getNodePos(node);
    const w = node.width, h = node.height;
    const handles = [
      { id: "nw", cx: x, cy: y },
      { id: "n", cx: x + w / 2, cy: y },
      { id: "ne", cx: x + w, cy: y },
      { id: "e", cx: x + w, cy: y + h / 2 },
      { id: "se", cx: x + w, cy: y + h },
      { id: "s", cx: x + w / 2, cy: y + h },
      { id: "sw", cx: x, cy: y + h },
      { id: "w", cx: x, cy: y + h / 2 },
    ];
    const cursors: Record<string, string> = {
      nw: "nw-resize", n: "n-resize", ne: "ne-resize",
      e: "e-resize", se: "se-resize", s: "s-resize",
      sw: "sw-resize", w: "w-resize",
    };
    return handles.map(h => (
      <div
        key={h.id}
        onMouseDown={(e) => handleResizeMouseDown(e, node, h.id)}
        style={{
          position: "absolute",
          left: h.cx - 5,
          top: h.cy - 5,
          width: 10,
          height: 10,
          background: "white",
          border: "2px solid #3B82F6",
          borderRadius: 2,
          cursor: cursors[h.id],
          zIndex: 20,
        }}
      />
    ));
  };

  const renderNode = (node: BoardNode) => {
    const { x, y } = getNodePos(node);
    const selected = isSelected(node._id);
    const editing = editingId === node._id;

    if (node.type === "arrow") {
      const x2 = node.x2 ?? x + node.width;
      const y2 = node.y2 ?? y + node.height;
      const minX = Math.min(x, x2);
      const minY = Math.min(y, y2);
      const maxX = Math.max(x, x2);
      const maxY = Math.max(y, y2);
      const pad = 16;
      const svgW = maxX - minX + pad * 2;
      const svgH = maxY - minY + pad * 2;
      const lx1 = x - minX + pad;
      const ly1 = y - minY + pad;
      const lx2 = x2 - minX + pad;
      const ly2 = y2 - minY + pad;
      const angle = Math.atan2(ly2 - ly1, lx2 - lx1);
      const arrowLen = 10;
      const a1x = lx2 - arrowLen * Math.cos(angle - 0.4);
      const a1y = ly2 - arrowLen * Math.sin(angle - 0.4);
      const a2x = lx2 - arrowLen * Math.cos(angle + 0.4);
      const a2y = ly2 - arrowLen * Math.sin(angle + 0.4);
      const stroke = node.strokeColor || "#6B6A68";
      const sw = node.strokeWidth || 2;

      return (
        <div
          key={node._id}
          style={{ position: "absolute", left: minX - pad, top: minY - pad, width: svgW, height: svgH, pointerEvents: "none" }}
        >
          <svg
            width={svgW} height={svgH}
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "all", cursor: "pointer" }}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onClick={(e) => handleNodeClick(e, node)}
          >
            <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={stroke} strokeWidth={sw} />
            <line x1={lx2} y1={ly2} x2={a1x} y2={a1y} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <line x1={lx2} y1={ly2} x2={a2x} y2={a2y} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            {selected && (
              <>
                <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#3B82F6" strokeWidth={sw + 4} strokeOpacity={0.3} />
                <circle cx={lx1} cy={ly1} r={5} fill="white" stroke="#3B82F6" strokeWidth={2} style={{ cursor: "move" }} />
                <circle cx={lx2} cy={ly2} r={5} fill="white" stroke="#3B82F6" strokeWidth={2} style={{ cursor: "move" }} />
              </>
            )}
          </svg>
        </div>
      );
    }

    if (node.type === "ellipse") {
      const rx = node.width / 2;
      const ry = node.height / 2;
      const stroke = node.strokeColor || "#6B6A68";
      const fill = node.fillColor || "transparent";
      const sw = node.strokeWidth || 2;
      return (
        <div
          key={node._id}
          onMouseDown={(e) => handleNodeMouseDown(e, node)}
          onClick={(e) => handleNodeClick(e, node)}
          onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
          style={{
            position: "absolute",
            left: x, top: y,
            width: node.width, height: node.height,
            cursor: tool === "select" ? (dragging && selectedIds.has(node._id) ? "move" : "pointer") : "crosshair",
          }}
        >
          <svg width={node.width} height={node.height} style={{ position: "absolute", overflow: "visible" }}>
            <ellipse
              cx={rx} cy={ry} rx={rx} ry={ry}
              stroke={selected ? "#3B82F6" : stroke}
              strokeWidth={selected ? sw + 1 : sw}
              fill={fill === "transparent" ? "none" : fill}
              strokeDasharray={selected ? "5 3" : undefined}
            />
          </svg>
          {editing && (
            <textarea
              ref={textareaRef}
              defaultValue={node.content || ""}
              onBlur={(e) => handleTextBlur(node, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute", inset: 0,
                background: "transparent", border: "none", outline: "none",
                resize: "none", padding: "8px", fontSize: node.fontSize || 13,
                color: "var(--text-primary)", fontFamily: "inherit",
                textAlign: "center",
              }}
            />
          )}
          {selected && !editing && node.content && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: node.fontSize || 13, color: "var(--text-primary)",
              pointerEvents: "none", padding: 8, textAlign: "center",
            }}>{node.content}</div>
          )}
          {selected && renderResizeHandles(node)}
        </div>
      );
    }

    if (node.type === "rect") {
      const stroke = node.strokeColor || "#6B6A68";
      const fill = node.fillColor || "transparent";
      const sw = node.strokeWidth || 2;
      return (
        <div
          key={node._id}
          onMouseDown={(e) => handleNodeMouseDown(e, node)}
          onClick={(e) => handleNodeClick(e, node)}
          onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
          style={{
            position: "absolute",
            left: x, top: y,
            width: node.width, height: node.height,
            border: `${selected ? sw + 1 : sw}px ${selected ? "dashed" : "solid"} ${selected ? "#3B82F6" : stroke}`,
            background: fill === "transparent" ? "transparent" : fill,
            borderRadius: 4,
            cursor: tool === "select" ? (dragging && selectedIds.has(node._id) ? "move" : "pointer") : "crosshair",
            boxSizing: "border-box",
          }}
        >
          {editing && (
            <textarea
              ref={textareaRef}
              defaultValue={node.content || ""}
              onBlur={(e) => handleTextBlur(node, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute", inset: 0,
                background: "transparent", border: "none", outline: "none",
                resize: "none", padding: "8px", fontSize: node.fontSize || 13,
                color: "var(--text-primary)", fontFamily: "inherit",
              }}
            />
          )}
          {!editing && node.content && (
            <div style={{
              padding: 8, fontSize: node.fontSize || 13,
              color: "var(--text-primary)", pointerEvents: "none",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{node.content}</div>
          )}
          {selected && renderResizeHandles(node)}
        </div>
      );
    }

    if (node.type === "text") {
      return (
        <div
          key={node._id}
          onMouseDown={(e) => handleNodeMouseDown(e, node)}
          onClick={(e) => handleNodeClick(e, node)}
          onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
          style={{
            position: "absolute",
            left: x, top: y,
            width: node.width,
            minHeight: node.height,
            cursor: editing ? "text" : tool === "select" ? "pointer" : "crosshair",
            outline: selected ? "2px dashed #3B82F6" : "none",
            outlineOffset: 2,
            borderRadius: 2,
            padding: "2px 4px",
          }}
        >
          {editing ? (
            <textarea
              ref={textareaRef}
              defaultValue={node.content || ""}
              onBlur={(e) => handleTextBlur(node, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "100%", minHeight: node.height,
                background: "transparent", border: "none", outline: "none",
                resize: "none", fontSize: node.fontSize || 14,
                color: "var(--text-primary)", fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          ) : (
            <div style={{
              fontSize: node.fontSize || 14, color: "var(--text-primary)",
              whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5,
              minHeight: 20,
            }}>
              {node.content || (selected ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Double-click to edit</span> : "")}
            </div>
          )}
          {selected && !editing && renderResizeHandles(node)}
        </div>
      );
    }

    // Default: note
    const noteColor = NOTE_COLORS[node.color as NoteColor] || NOTE_COLORS.yellow;
    const textColor = NOTE_TEXT_COLORS[node.color as NoteColor] || NOTE_TEXT_COLORS.yellow;

    return (
      <div
        key={node._id}
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        onClick={(e) => handleNodeClick(e, node)}
        onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
        style={{
          position: "absolute",
          left: x, top: y,
          width: node.width, height: node.height,
          background: noteColor,
          border: selected ? "2px dashed #3B82F6" : "1px solid rgba(0,0,0,0.12)",
          borderRadius: 6,
          boxShadow: selected ? "0 0 0 2px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.15)",
          cursor: editing ? "text" : tool === "select" ? (dragging && selectedIds.has(node._id) ? "move" : "pointer") : "crosshair",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          userSelect: editing ? "text" : "none",
        }}
      >
        {/* Color bar at top */}
        <div style={{ height: 4, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />

        {editing ? (
          <textarea
            ref={textareaRef}
            defaultValue={node.content || ""}
            onBlur={(e) => handleTextBlur(node, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") { handleTextBlur(node, (e.target as HTMLTextAreaElement).value); }
            }}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              resize: "none", padding: "8px", fontSize: node.fontSize || 13,
              fontFamily: "inherit", color: textColor, lineHeight: 1.5,
            }}
          />
        ) : (
          <div style={{
            flex: 1, padding: "8px",
            fontSize: node.fontSize || 13, color: textColor,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            overflow: "hidden", lineHeight: 1.5,
            pointerEvents: "none",
          }}>
            {node.content || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
          </div>
        )}

        {/* Color picker on select, bottom */}
        {selected && !editing && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: "flex", gap: 4, padding: "4px 8px",
              background: "rgba(0,0,0,0.06)", flexShrink: 0,
            }}
          >
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
              <button
                key={c}
                onClick={(e) => { e.stopPropagation(); updateNode({ id: node._id, color: c }); }}
                style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: NOTE_COLORS[c],
                  border: node.color === c ? "2px solid #333" : "1px solid rgba(0,0,0,0.2)",
                  cursor: "pointer", flexShrink: 0,
                }}
              />
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode({ id: node._id }); setSelectedIds(new Set()); }}
              style={{
                marginLeft: "auto", background: "#ef4444", border: "none",
                color: "white", borderRadius: 3, cursor: "pointer",
                fontSize: 11, padding: "0 5px", lineHeight: "14px",
              }}
            >✕</button>
          </div>
        )}

        {selected && renderResizeHandles(node)}
      </div>
    );
  };

  // ─── Canvas cursor ────────────────────────────────────────────────────────
  const getCursor = () => {
    if (panning || spaceHeld.current) return "grabbing";
    if (tool === "hand") return "grab";
    if (tool === "select") return dragging ? "move" : "default";
    return "crosshair";
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-app)", overflow: "hidden" }}>

      {/* Left toolbar */}
      <div style={{
        width: 48, background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 0", gap: 2, flexShrink: 0,
      }}>
        {(["select", "hand", "note", "text", "rect", "ellipse", "arrow"] as Tool[]).map(t => (
          <button
            key={t}
            title={TOOL_LABELS[t]}
            onClick={() => setTool(t)}
            style={{
              width: 36, height: 36, borderRadius: 6,
              background: tool === t ? "var(--bg-card-elevated)" : "transparent",
              border: tool === t ? "1px solid var(--border-default)" : "1px solid transparent",
              color: tool === t ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer", fontSize: t === "text" ? 14 : 16,
              fontWeight: t === "text" ? 700 : 400,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.1s",
            }}
          >
            {TOOL_ICONS[t]}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Delete selected */}
        {selectedIds.size > 0 && (
          <button
            title={`Delete ${selectedIds.size} item(s)`}
            onClick={() => {
              deleteManyNodes({ ids: [...selectedIds] as Id<"boardNodes">[] });
              setSelectedIds(new Set());
            }}
            style={{
              width: 36, height: 36, borderRadius: 6,
              background: "transparent", border: "1px solid transparent",
              color: "#ef4444", cursor: "pointer", fontSize: 16,
            }}
          >🗑</button>
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 16px",
          height: 52,
          display: "flex", alignItems: "center",
          background: "var(--bg-secondary)", flexShrink: 0, gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>ucals</Link>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <Link href="/stack" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>stack</Link>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <Link href="/docs" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>docs</Link>
            <span style={{ color: "var(--border-default)" }}>/</span>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>canvas</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {TOOL_LABELS[tool]}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setScale(s => Math.min(5, s * 1.2))} style={zoomBtnStyle}>+</button>
              <button
                onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                style={{ ...zoomBtnStyle, minWidth: 44, fontSize: 11 }}
              >{Math.round(scale * 100)}%</button>
              <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))} style={zoomBtnStyle}>−</button>
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            cursor: getCursor(),
            backgroundImage: `url("${DOT_GRID_SVG}")`,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`,
          }}
        >
          {/* Canvas content */}
          <div style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
          }}>
            {(nodes as BoardNode[]).map(node => renderNode(node))}
          </div>

          {/* Selection rect (screen space) */}
          {selectionRect && selectionRect.w > 2 && (
            <div style={{
              position: "absolute",
              left: selectionRect.x * scale + offset.x,
              top: selectionRect.y * scale + offset.y,
              width: selectionRect.w * scale,
              height: selectionRect.h * scale,
              border: "1.5px dashed #3B82F6",
              background: "rgba(59,130,246,0.06)",
              pointerEvents: "none",
            }} />
          )}

          {/* Draw preview (screen space) */}
          {drawing && drawRect && drawingToolRef.current !== "arrow" && (drawRect.w > 2 || drawRect.h > 2) && (
            <div style={{
              position: "absolute",
              left: drawRect.x * scale + offset.x,
              top: drawRect.y * scale + offset.y,
              width: drawRect.w * scale,
              height: drawRect.h * scale,
              border: "1.5px dashed #3B82F6",
              background: drawingToolRef.current === "note" ? "rgba(254,243,199,0.3)" : "rgba(59,130,246,0.04)",
              borderRadius: drawingToolRef.current === "note" ? 6 : drawingToolRef.current === "ellipse" ? "50%" : 2,
              pointerEvents: "none",
            }} />
          )}

          {/* Arrow draw preview */}
          {drawing && drawRect && drawingToolRef.current === "arrow" && (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
              <line
                x1={drawRect.x * scale + offset.x}
                y1={drawRect.y * scale + offset.y}
                x2={(drawRect.x + drawRect.w) * scale + offset.x}
                y2={(drawRect.y + drawRect.h) * scale + offset.y}
                stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 3"
              />
            </svg>
          )}

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
                <div style={{ fontSize: 12, opacity: 0.7 }}>Pick a tool from the left panel or press N for a note</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: "var(--bg-card-elevated)",
  border: "1px solid var(--border-default)",
  borderRadius: 5,
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  width: 28,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};
