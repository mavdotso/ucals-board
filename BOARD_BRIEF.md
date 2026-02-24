# Board Page — Excalidraw-like Rebuild Brief

## Context
This is a Next.js 14 + Convex app. The `/board` page at `app/board/page.tsx` is a broken sticky-notes canvas. The goal is to rebuild it into a fully functional Excalidraw-style infinite canvas planning tool.

## Tech Stack
- Next.js 14 (App Router) — `"use client"` for canvas page
- Convex for real-time backend (`convex/board.ts`, schema in `convex/schema.ts`)
- Existing CSS variables: `--bg-app`, `--bg-secondary`, `--bg-card-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-default`
- Do NOT install Excalidraw as a library — build the canvas from scratch

## What to Build

### Core Canvas Features (must-have)
1. **Infinite canvas** — pan with spacebar+drag or middle-mouse drag, zoom with scroll wheel (10%–500%)
2. **Selection tool** — click to select, drag to multi-select with a rubber-band box
3. **Move** — drag selected elements freely, snap to grid optional
4. **Sticky notes** — the existing note type, but make text editing work properly (click once to select, double-click to edit inline text, textarea auto-grows, blur to save)
5. **Text elements** — standalone text blocks (not inside a card), double-click canvas to create
6. **Shapes** — rectangle, ellipse, arrow/line (draw by dragging)
7. **Resize handles** — 8-point handles on selected element corners/edges
8. **Delete** — Delete/Backspace key removes selected elements
9. **Undo/Redo** — Cmd+Z / Cmd+Shift+Z (local history, at least 50 steps)
10. **Keyboard shortcuts**:
    - `V` = select tool
    - `N` or `S` = sticky note tool
    - `T` = text tool
    - `R` = rectangle tool
    - `E` = ellipse tool
    - `L` or `A` = arrow/line tool
    - `H` = hand/pan tool
    - `Space+drag` = pan (any tool)
    - `Ctrl/Cmd+A` = select all
    - `Escape` = deselect / cancel
    - `Del/Backspace` = delete selected

### Toolbar
- Left sidebar or top toolbar with tool icons (lucide-react icons are available)
- Active tool is highlighted
- Zoom controls: zoom in, zoom out, reset to 100%, fit to content

### Note Editing (fix the broken part)
- Single click = select note (show resize handles + move cursor)
- Double click = enter edit mode — cursor appears inside, type freely
- In edit mode, mouse events on the note don't trigger canvas pan
- Blur or Escape = exit edit mode, save to Convex
- Notes are resizable by dragging corner/edge handles

### Convex Schema Updates
The existing `boardNodes` table has `type: "note"` only. Extend it to support multiple types.

Update `convex/schema.ts` — change `boardNodes` to:
```typescript
boardNodes: defineTable({
  type: v.union(v.literal("note"), v.literal("text"), v.literal("rect"), v.literal("ellipse"), v.literal("arrow")),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  content: v.optional(v.string()),
  color: v.optional(v.union(v.literal("yellow"), v.literal("blue"), v.literal("green"), v.literal("pink"), v.literal("white"), v.literal("gray"))),
  // For shapes
  strokeColor: v.optional(v.string()),
  fillColor: v.optional(v.string()),
  strokeWidth: v.optional(v.number()),
  // For arrows/lines
  x2: v.optional(v.number()),
  y2: v.optional(v.number()),
  // Font size for text
  fontSize: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_createdAt", ["createdAt"]),
```

Update `convex/board.ts` mutations to match the new schema (make all new fields optional in args, update `update` mutation to accept all fields).

### Visual Design
- Canvas background: subtle dot grid (CSS, same as Excalidraw)
- Notes: colored sticky note aesthetic, slight shadow
- Shapes: clean vector-style, stroke-only by default with optional fill
- Arrows: straight lines with arrowhead
- Selection: blue dashed border + blue resize handles
- Toolbar: clean, minimal, matches existing app dark theme

### File Structure
Only modify these files (do not touch Board.tsx or other components):
- `app/board/page.tsx` — full rewrite
- `convex/schema.ts` — extend boardNodes table
- `convex/board.ts` — extend mutations

## Important Constraints
- Do NOT break the existing `/` page (Board.tsx / Kanban) — don't touch it
- Do NOT touch `convex/cards.ts`, `convex/posts.ts`, `convex/docs.ts`
- The schema change MUST be backward-compatible (all new fields optional)
- Run `npm run build` at the end to verify zero TypeScript errors
- Commit when done with message: `feat: rebuild /board as excalidraw-style canvas`

## When Done
Run: `openclaw system event --text "Done: ucals-board /board rebuilt as Excalidraw-style canvas" --mode now`
