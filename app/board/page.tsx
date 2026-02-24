"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Nav } from "@/app/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

type ElementType = "rect" | "ellipse" | "arrow" | "line" | "text" | "note" | "freedraw";
type Tool = "select" | "hand" | "rect" | "ellipse" | "arrow" | "line" | "text" | "note" | "freedraw";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  // For arrows/lines
  points?: number[][];
  // For freedraw
  path?: number[][];
  // Visual
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  // Text/Note
  text?: string;
  fontSize?: number;
  // Note color
  noteColor?: string;
  // Metadata
  locked?: boolean;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "ucals-board-canvas";

const NOTE_COLORS = [
  { name: "yellow", bg: "#FEF3C7", fg: "#92400E" },
  { name: "blue", bg: "#DBEAFE", fg: "#1E40AF" },
  { name: "green", bg: "#D1FAE5", fg: "#065F46" },
  { name: "pink", bg: "#FCE7F3", fg: "#9D174D" },
  { name: "orange", bg: "#FFEDD5", fg: "#C2410C" },
  { name: "purple", bg: "#EDE9FE", fg: "#6D28D9" },
];

const STROKE_COLORS = [
  "#F5F4F2", "#A5A4A0", "#6B6A68", "#3B82F6", "#EF4444",
  "#22C55E", "#F59E0B", "#A855F7", "#EC4899",
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadElements(): CanvasElement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveElements(els: CanvasElement[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(els)); } catch {}
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

function hitTest(el: CanvasElement, px: number, py: number, tolerance = 6): boolean {
  if (el.type === "freedraw" && el.path) {
    for (const [x, y] of el.path) {
      if (Math.abs(px - x) < tolerance && Math.abs(py - y) < tolerance) return true;
    }
    return false;
  }
  if (el.type === "arrow" || el.type === "line") {
    const x1 = el.x, y1 = el.y;
    const x2 = el.x + el.width, y2 = el.y + el.height;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) < tolerance;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const projX = x1 + t * dx, projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2) < tolerance;
  }
  if (el.type === "ellipse") {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    const rx = Math.abs(el.width) / 2 + tolerance, ry = Math.abs(el.height) / 2 + tolerance;
    return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
  }
  // rect, text, note — bounding box
  const x1 = Math.min(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  const x2 = Math.max(el.x, el.x + el.width);
  const y2 = Math.max(el.y, el.y + el.height);
  return px >= x1 - tolerance && px <= x2 + tolerance && py >= y1 - tolerance && py <= y2 + tolerance;
}

function getResizeHandle(el: CanvasElement, px: number, py: number, tolerance = 8): string | null {
  if (el.type === "arrow" || el.type === "line" || el.type === "freedraw") return null;
  const x1 = Math.min(el.x, el.x + el.width), y1 = Math.min(el.y, el.y + el.height);
  const x2 = Math.max(el.x, el.x + el.width), y2 = Math.max(el.y, el.y + el.height);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const handles: [string, number, number][] = [
    ["nw", x1, y1], ["n", mx, y1], ["ne", x2, y1],
    ["w", x1, my], ["e", x2, my],
    ["sw", x1, y2], ["s", mx, y2], ["se", x2, y2],
  ];
  for (const [name, hx, hy] of handles) {
    if (Math.abs(px - hx) < tolerance && Math.abs(py - hy) < tolerance) return name;
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BoardPage() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [tool, setToolState] = useState<Tool>("select");
  const toolRef = useRef<Tool>("select");
  const setTool = useCallback((t: Tool) => { toolRef.current = t; setToolState(t); }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [strokeColor, setStrokeColor] = useState("#F5F4F2");
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Interaction state
  const [action, setAction] = useState<string | null>(null); // "draw"|"drag"|"pan"|"resize"|"select-box"
  const actionRef = useRef<string | null>(null);
  const startRef = useRef({ sx: 0, sy: 0, cx: 0, cy: 0 }); // screen + canvas coords
  const drawingElRef = useRef<CanvasElement | null>(null);
  const dragStartEls = useRef<Map<string, { x: number; y: number }>>(new Map());
  const resizeRef = useRef({ handle: "", origX: 0, origY: 0, origW: 0, origH: 0 });
  const [selectBox, setSelectBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Undo/redo
  const historyRef = useRef<CanvasElement[][]>([]);
  const historyIdxRef = useRef(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // ─── Init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const loaded = loadElements();
    setElements(loaded);
    historyRef.current = [loaded];
    historyIdxRef.current = 0;
  }, []);

  // ─── Save on change ────────────────────────────────────────────────────

  useEffect(() => { saveElements(elements); }, [elements]);

  // ─── History ───────────────────────────────────────────────────────────

  const pushHistory = useCallback((els: CanvasElement[]) => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    historyRef.current = [...h.slice(0, idx + 1), els].slice(-100);
    historyIdxRef.current = historyRef.current.length - 1;
    setElements(els);
  }, []);

  const undo = useCallback(() => {
    const idx = historyIdxRef.current;
    if (idx <= 0) return;
    historyIdxRef.current = idx - 1;
    setElements(historyRef.current[idx - 1]);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    if (idx >= h.length - 1) return;
    historyIdxRef.current = idx + 1;
    setElements(h[idx + 1]);
  }, []);

  // ─── Coordinate conversion ─────────────────────────────────────────────

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - camera.x) / camera.zoom,
      y: (sy - rect.top - camera.y) / camera.zoom,
    };
  }, [camera]);

  // ─── Render canvas ─────────────────────────────────────────────────────

  const renderCanvas = useCallback(() => {
    const cvs = canvasRef.current;
    const container = containerRef.current;
    if (!cvs || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    cvs.width = w * dpr;
    cvs.height = h * dpr;
    cvs.style.width = w + "px";
    cvs.style.height = h + "px";
    const ctx = cvs.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Dot grid
    ctx.save();
    const gridSize = 20 * camera.zoom;
    const offX = camera.x % gridSize;
    const offY = camera.y % gridSize;
    ctx.fillStyle = "#3A3937";
    for (let x = offX; x < w; x += gridSize) {
      for (let y = offY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Transform for elements
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    for (const el of elements) {
      ctx.save();
      const isSelected = selectedIds.has(el.id);

      if (el.type === "freedraw" && el.path && el.path.length > 1) {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(el.path[0][0], el.path[0][1]);
        for (let i = 1; i < el.path.length; i++) {
          ctx.lineTo(el.path[i][0], el.path[i][1]);
        }
        ctx.stroke();
      } else if (el.type === "arrow" || el.type === "line") {
        const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (el.type === "arrow") {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const al = 12;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - al * Math.cos(angle - 0.35), y2 - al * Math.sin(angle - 0.35));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - al * Math.cos(angle + 0.35), y2 - al * Math.sin(angle + 0.35));
          ctx.stroke();
        }
      } else if (el.type === "ellipse") {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(el.width) / 2, Math.abs(el.height) / 2, 0, 0, Math.PI * 2);
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (el.type === "rect") {
        const rx = Math.min(el.x, el.x + el.width), ry = Math.min(el.y, el.y + el.height);
        const rw = Math.abs(el.width), rh = Math.abs(el.height);
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 4);
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (el.type === "note") {
        const nc = NOTE_COLORS.find(c => c.bg === el.noteColor) || NOTE_COLORS[0];
        const rx = Math.min(el.x, el.x + el.width), ry = Math.min(el.y, el.y + el.height);
        const rw = Math.abs(el.width), rh = Math.abs(el.height);
        ctx.fillStyle = nc.bg;
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 6);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Text inside note
        if (el.text && el.id !== editingId) {
          ctx.fillStyle = nc.fg;
          ctx.font = `${el.fontSize || 14}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textBaseline = "top";
          const lines = wrapText(ctx, el.text, rw - 20);
          lines.forEach((line, i) => {
            ctx.fillText(line, rx + 10, ry + 10 + i * (el.fontSize || 14) * 1.5);
          });
        }
      } else if (el.type === "text") {
        if (el.text && el.id !== editingId) {
          ctx.fillStyle = el.strokeColor;
          ctx.font = `${el.fontSize || 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textBaseline = "top";
          const lines = (el.text || "").split("\n");
          lines.forEach((line, i) => {
            ctx.fillText(line, el.x, el.y + i * (el.fontSize || 18) * 1.4);
          });
        }
      }

      // Selection outline
      if (isSelected) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
        if (el.type === "arrow" || el.type === "line" || el.type === "freedraw") {
          // Bounding box
          const bb = getBBox(el);
          ctx.strokeRect(bb.x - 4, bb.y - 4, bb.w + 8, bb.h + 8);
        } else {
          const rx = Math.min(el.x, el.x + el.width) - 4;
          const ry = Math.min(el.y, el.y + el.height) - 4;
          ctx.strokeRect(rx, ry, Math.abs(el.width) + 8, Math.abs(el.height) + 8);
        }
        ctx.setLineDash([]);

        // Resize handles
        if (el.type !== "arrow" && el.type !== "line" && el.type !== "freedraw") {
          const bx = Math.min(el.x, el.x + el.width), by = Math.min(el.y, el.y + el.height);
          const bw = Math.abs(el.width), bh = Math.abs(el.height);
          const hSize = 6 / camera.zoom;
          const handles = [
            [bx, by], [bx + bw / 2, by], [bx + bw, by],
            [bx, by + bh / 2], [bx + bw, by + bh / 2],
            [bx, by + bh], [bx + bw / 2, by + bh], [bx + bw, by + bh],
          ];
          for (const [hx, hy] of handles) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 1.5 / camera.zoom;
            ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
            ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
          }
        }
      }

      ctx.restore();
    }

    // Selection box
    if (selectBox) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.setLineDash([4 / camera.zoom]);
      ctx.fillStyle = "rgba(59,130,246,0.06)";
      ctx.fillRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
      ctx.strokeRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [elements, camera, selectedIds, selectBox, editingId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const observer = new ResizeObserver(() => renderCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [renderCanvas]);

  // ─── Text wrap helper ──────────────────────────────────────────────────

  // ─── Keyboard ──────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "textarea" || tag === "input") return;

      if (e.code === "Space" && !e.repeat) { e.preventDefault(); }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") { e.preventDefault(); setSelectedIds(new Set(elements.map(e => e.id))); return; }

      const toolMap: Record<string, Tool> = {
        v: "select", "1": "select",
        h: "hand", "2": "hand",
        r: "rect", "3": "rect",
        e: "ellipse",
        d: "freedraw",
        a: "arrow",
        l: "line",
        t: "text",
        n: "note",
      };
      if (!e.metaKey && !e.ctrlKey && toolMap[e.key.toLowerCase()]) {
        setTool(toolMap[e.key.toLowerCase()]);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        pushHistory(elements.filter(el => !selectedIds.has(el.id)));
        setSelectedIds(new Set());
        return;
      }

      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setEditingId(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [elements, selectedIds, undo, redo, pushHistory, setTool]);

  // ─── Zoom ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.06 : 0.94;
      setCamera(cam => {
        const nz = Math.max(0.1, Math.min(5, cam.zoom * factor));
        return {
          x: mx - (mx - cam.x) * (nz / cam.zoom),
          y: my - (my - cam.y) * (nz / cam.zoom),
          zoom: nz,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Pointer handlers ─────────────────────────────────────────────────

  const spaceDown = useRef(false);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === "Space") spaceDown.current = true; };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") spaceDown.current = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const cp = screenToCanvas(e.clientX, e.clientY);
    const currentTool = toolRef.current;
    startRef.current = { sx: e.clientX, sy: e.clientY, cx: cp.x, cy: cp.y };

    // Pan with space or hand tool
    if (spaceDown.current || currentTool === "hand") {
      actionRef.current = "pan";
      setAction("pan");
      return;
    }

    // Select tool
    if (currentTool === "select") {
      // Check resize handles first
      for (const id of selectedIds) {
        const el = elements.find(e => e.id === id);
        if (!el) continue;
        const handle = getResizeHandle(el, cp.x, cp.y, 8 / camera.zoom);
        if (handle) {
          actionRef.current = "resize";
          setAction("resize");
          resizeRef.current = { handle, origX: el.x, origY: el.y, origW: el.width, origH: el.height };
          return;
        }
      }

      // Hit test elements (reverse order = topmost first)
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], cp.x, cp.y, 6 / camera.zoom)) {
          const el = elements[i];
          if (!e.shiftKey) {
            if (!selectedIds.has(el.id)) setSelectedIds(new Set([el.id]));
          } else {
            const next = new Set(selectedIds);
            next.has(el.id) ? next.delete(el.id) : next.add(el.id);
            setSelectedIds(next);
          }
          actionRef.current = "drag";
          setAction("drag");
          const starts = new Map<string, { x: number; y: number }>();
          const ids = new Set(selectedIds);
          ids.add(el.id);
          ids.forEach(id => {
            const e = elements.find(el => el.id === id);
            if (e) starts.set(id, { x: e.x, y: e.y });
          });
          dragStartEls.current = starts;
          return;
        }
      }

      // Nothing hit — start selection box
      actionRef.current = "select-box";
      setAction("select-box");
      setSelectedIds(new Set());
      return;
    }

    // Drawing tools
    actionRef.current = "draw";
    setAction("draw");

    const base: CanvasElement = {
      id: uid(), type: currentTool as ElementType,
      x: cp.x, y: cp.y, width: 0, height: 0,
      strokeColor, fillColor: "transparent", strokeWidth,
    };

    if (currentTool === "note") {
      base.width = 200;
      base.height = 150;
      base.x = cp.x - 100;
      base.y = cp.y - 75;
      base.noteColor = noteColor.bg;
      base.text = "";
      base.fontSize = 14;
    } else if (currentTool === "text") {
      base.text = "";
      base.fontSize = 18;
      base.width = 200;
      base.height = 30;
    } else if (currentTool === "freedraw") {
      base.path = [[cp.x, cp.y]];
    }

    drawingElRef.current = base;

    if (currentTool === "note" || currentTool === "text") {
      // Instant create, start editing
      pushHistory([...elements, base]);
      setSelectedIds(new Set([base.id]));
      setEditingId(base.id);
      setTool("select");
      actionRef.current = null;
      setAction(null);
      drawingElRef.current = null;
    }
  }, [elements, camera, selectedIds, screenToCanvas, pushHistory, strokeColor, strokeWidth, noteColor, setTool]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const act = actionRef.current;
    if (!act) return;
    const cp = screenToCanvas(e.clientX, e.clientY);

    if (act === "pan") {
      const dx = e.clientX - startRef.current.sx;
      const dy = e.clientY - startRef.current.sy;
      setCamera(cam => ({
        x: cam.x + dx, y: cam.y + dy, zoom: cam.zoom,
      }));
      startRef.current.sx = e.clientX;
      startRef.current.sy = e.clientY;
      return;
    }

    if (act === "drag") {
      const dx = cp.x - startRef.current.cx;
      const dy = cp.y - startRef.current.cy;
      setElements(prev => prev.map(el => {
        const start = dragStartEls.current.get(el.id);
        if (!start) return el;
        return { ...el, x: start.x + dx, y: start.y + dy };
      }));
      return;
    }

    if (act === "resize") {
      const dx = cp.x - startRef.current.cx;
      const dy = cp.y - startRef.current.cy;
      const { handle, origX, origY, origW, origH } = resizeRef.current;
      const id = [...selectedIds][0];
      setElements(prev => prev.map(el => {
        if (el.id !== id) return el;
        let nx = origX, ny = origY, nw = origW, nh = origH;
        if (handle.includes("e")) nw = origW + dx;
        if (handle.includes("s")) nh = origH + dy;
        if (handle.includes("w")) { nx = origX + dx; nw = origW - dx; }
        if (handle.includes("n")) { ny = origY + dy; nh = origH - dy; }
        return { ...el, x: nx, y: ny, width: nw, height: nh };
      }));
      return;
    }

    if (act === "select-box") {
      const sx = startRef.current.cx, sy = startRef.current.cy;
      setSelectBox({
        x: Math.min(sx, cp.x), y: Math.min(sy, cp.y),
        w: Math.abs(cp.x - sx), h: Math.abs(cp.y - sy),
      });
      return;
    }

    if (act === "draw" && drawingElRef.current) {
      const el = drawingElRef.current;
      if (el.type === "freedraw") {
        el.path = [...(el.path || []), [cp.x, cp.y]];
        // Update bounding box
        const xs = el.path.map(p => p[0]), ys = el.path.map(p => p[1]);
        el.x = Math.min(...xs); el.y = Math.min(...ys);
        el.width = Math.max(...xs) - el.x; el.height = Math.max(...ys) - el.y;
      } else {
        el.width = cp.x - el.x;
        el.height = cp.y - el.y;
      }
      drawingElRef.current = { ...el };
      // Render preview
      renderCanvas();
      // Draw the in-progress element on top
      const cvs = canvasRef.current!;
      const ctx = cvs.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      drawElement(ctx, el);
      ctx.restore();
    }
  }, [camera, screenToCanvas, selectedIds, renderCanvas]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const act = actionRef.current;
    actionRef.current = null;
    setAction(null);

    if (act === "drag" || act === "resize") {
      // Commit to history
      pushHistory([...elements]);
      return;
    }

    if (act === "select-box" && selectBox) {
      const ids = new Set<string>();
      elements.forEach(el => {
        const bb = getBBox(el);
        const sx = selectBox.x, sy = selectBox.y, sw = selectBox.w, sh = selectBox.h;
        if (bb.x < sx + sw && bb.x + bb.w > sx && bb.y < sy + sh && bb.y + bb.h > sy) {
          ids.add(el.id);
        }
      });
      setSelectedIds(ids);
      setSelectBox(null);
      return;
    }

    if (act === "draw" && drawingElRef.current) {
      const el = drawingElRef.current;
      drawingElRef.current = null;
      // Skip tiny elements
      if (el.type === "freedraw") {
        if (!el.path || el.path.length < 3) return;
      } else if (Math.abs(el.width) < 3 && Math.abs(el.height) < 3) return;
      pushHistory([...elements, el]);
      setSelectedIds(new Set([el.id]));
      setTool("select");
    }

    setSelectBox(null);
  }, [elements, selectBox, pushHistory, setTool]);

  // ─── Text editing ─────────────────────────────────────────────────────

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
    }
  }, [editingId]);

  const onTextCommit = useCallback((id: string, text: string) => {
    pushHistory(elements.map(el => el.id === id ? { ...el, text } : el));
    setEditingId(null);
  }, [elements, pushHistory]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const cp = screenToCanvas(e.clientX, e.clientY);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if ((el.type === "note" || el.type === "text") && hitTest(el, cp.x, cp.y)) {
        setSelectedIds(new Set([el.id]));
        setEditingId(el.id);
        return;
      }
    }
    // Double click on blank = create text
    const el: CanvasElement = {
      id: uid(), type: "text", x: cp.x, y: cp.y, width: 200, height: 30,
      strokeColor, fillColor: "transparent", strokeWidth: 1,
      text: "", fontSize: 18,
    };
    pushHistory([...elements, el]);
    setSelectedIds(new Set([el.id]));
    setEditingId(el.id);
  }, [elements, screenToCanvas, strokeColor, pushHistory]);

  // ─── Cursor ────────────────────────────────────────────────────────────

  const getCursor = () => {
    if (action === "pan" || spaceDown.current) return "grabbing";
    if (tool === "hand") return "grab";
    if (tool === "select") return "default";
    return "crosshair";
  };

  // ─── Editing element overlay ──────────────────────────────────────────

  const editingEl = editingId ? elements.find(e => e.id === editingId) : null;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/board" right={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Tools */}
          {(["select", "hand", "note", "text", "rect", "ellipse", "arrow", "line", "freedraw"] as Tool[]).map(t => {
            const icons: Record<Tool, string> = {
              select: "↖", hand: "✋", note: "📝", text: "T",
              rect: "▭", ellipse: "◯", arrow: "↗", line: "╱", freedraw: "✏️",
            };
            const keys: Record<Tool, string> = {
              select: "V", hand: "H", note: "N", text: "T",
              rect: "R", ellipse: "E", arrow: "A", line: "L", freedraw: "D",
            };
            return (
              <button
                key={t}
                onClick={() => setTool(t)}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} (${keys[t]})`}
                style={{
                  width: 32, height: 28, borderRadius: 5, fontSize: t === "text" ? 13 : 14,
                  fontWeight: t === "text" ? 700 : 400,
                  background: tool === t ? "var(--bg-card-elevated)" : "transparent",
                  border: tool === t ? "1px solid var(--border-default)" : "1px solid transparent",
                  color: tool === t ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >{icons[t]}</button>
            );
          })}

          <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />

          {/* Color picker (for drawing tools) */}
          {tool === "note" ? (
            <div style={{ display: "flex", gap: 2 }}>
              {NOTE_COLORS.map(c => (
                <button key={c.name} onClick={() => setNoteColor(c)} style={{
                  width: 16, height: 16, borderRadius: "50%", background: c.bg, cursor: "pointer",
                  border: noteColor.name === c.name ? "2px solid var(--text-primary)" : "1px solid var(--border-default)",
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 2 }}>
              {STROKE_COLORS.slice(0, 6).map(c => (
                <button key={c} onClick={() => setStrokeColor(c)} style={{
                  width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                  border: strokeColor === c ? "2px solid var(--text-primary)" : "1px solid var(--border-default)",
                }} />
              ))}
            </div>
          )}

          <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 4px" }} />

          {/* Zoom */}
          <div style={{ display: "flex", gap: 2 }}>
            <ZBtn onClick={() => setCamera(c => ({ ...c, zoom: Math.min(5, c.zoom * 1.2) }))}>+</ZBtn>
            <ZBtn onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })} w={40}>{Math.round(camera.zoom * 100)}%</ZBtn>
            <ZBtn onClick={() => setCamera(c => ({ ...c, zoom: Math.max(0.1, c.zoom / 1.2) }))}>−</ZBtn>
          </div>
        </div>
      } />

      {/* Canvas area */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ flex: 1, position: "relative", overflow: "hidden", cursor: getCursor() }}
      >
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

        {/* Text editing overlay */}
        {editingEl && (
          <div style={{
            position: "absolute",
            left: editingEl.x * camera.zoom + camera.x,
            top: editingEl.y * camera.zoom + camera.y,
            width: Math.max(Math.abs(editingEl.width), 100) * camera.zoom,
            minHeight: Math.max(Math.abs(editingEl.height), 30) * camera.zoom,
            zIndex: 10,
          }}>
            <textarea
              ref={editRef}
              defaultValue={editingEl.text || ""}
              onBlur={(e) => onTextCommit(editingEl.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onTextCommit(editingEl.id, (e.target as HTMLTextAreaElement).value);
                }
              }}
              style={{
                width: "100%",
                minHeight: editingEl.type === "note"
                  ? Math.abs(editingEl.height) * camera.zoom - 10
                  : Math.abs(editingEl.height) * camera.zoom,
                background: editingEl.type === "note"
                  ? (editingEl.noteColor || NOTE_COLORS[0].bg)
                  : "transparent",
                border: "2px solid #3B82F6",
                borderRadius: editingEl.type === "note" ? 6 : 2,
                outline: "none", resize: "both", overflow: "hidden",
                padding: editingEl.type === "note" ? "10px 12px" : "4px 6px",
                fontSize: (editingEl.fontSize || 14) * camera.zoom,
                fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                color: editingEl.type === "note"
                  ? (NOTE_COLORS.find(c => c.bg === editingEl.noteColor) || NOTE_COLORS[0]).fg
                  : editingEl.strokeColor,
                lineHeight: 1.5,
                boxShadow: "0 0 0 3px rgba(59,130,246,0.2)",
              }}
            />
          </div>
        )}

        {/* Empty state */}
        {elements.length === 0 && !action && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Blank canvas</div>
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
                N = note · T = text · R = rect · E = ellipse · A = arrow · D = draw<br />
                Space+drag = pan · Scroll = zoom · Double-click = text
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draw element helper (for preview during draw) ───────────────────────────

function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (el.type === "freedraw" && el.path && el.path.length > 1) {
    ctx.beginPath();
    ctx.moveTo(el.path[0][0], el.path[0][1]);
    for (let i = 1; i < el.path.length; i++) ctx.lineTo(el.path[i][0], el.path[i][1]);
    ctx.stroke();
  } else if (el.type === "arrow" || el.type === "line") {
    const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (el.type === "arrow") {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 12 * Math.cos(angle - 0.35), y2 - 12 * Math.sin(angle - 0.35));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 12 * Math.cos(angle + 0.35), y2 - 12 * Math.sin(angle + 0.35));
      ctx.stroke();
    }
  } else if (el.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width) / 2, Math.abs(el.height) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (el.type === "rect") {
    ctx.beginPath();
    ctx.roundRect(Math.min(el.x, el.x + el.width), Math.min(el.y, el.y + el.height), Math.abs(el.width), Math.abs(el.height), 4);
    ctx.stroke();
  }
}

function getBBox(el: CanvasElement) {
  if (el.type === "freedraw" && el.path && el.path.length > 0) {
    const xs = el.path.map(p => p[0]), ys = el.path.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return {
    x: Math.min(el.x, el.x + el.width),
    y: Math.min(el.y, el.y + el.height),
    w: Math.abs(el.width),
    h: Math.abs(el.height),
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}

function ZBtn({ onClick, children, w }: { onClick: () => void; children: React.ReactNode; w?: number }) {
  return (
    <button onClick={onClick} style={{
      background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)",
      borderRadius: 5, color: "var(--text-secondary)", cursor: "pointer",
      fontSize: w ? 11 : 14, fontWeight: 600,
      width: w || 28, height: 26,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{children}</button>
  );
}
