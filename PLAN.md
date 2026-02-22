# UCals Board — 3 Features Implementation Plan

Implement these three features in order. Commit after each one. Push to main after all three.

---

## Feature 1: Docs sidebar — folder/file tree (not agent grouping)

**File:** `app/docs/page.tsx`

**Problem:** Sidebar groups docs by `agent` field (aria, maya, leo). Replace with a real folder/file tree parsed from the `path` field.

**Implementation:**
- Parse `path` field (e.g. `maya/2026-02-20-landing-page.md`) into a tree: `{ folders: { maya: [doc, doc] }, files: [doc] }`
- Sidebar renders collapsible folder sections (chevron toggle)
- Folder label = first path segment, capitalized (e.g. `maya` → `Maya`)
- File label = doc `title` field (not filename)
- Remove agent color dots — plain clean tree
- Keep: search filter, board filter (marketing/product/all), split-panel layout, edit/save/delete functionality
- Sort: folders alphabetically, files within folders by `updatedAt` desc

**Commit:** `feat: docs sidebar shows folder/file tree from path field`

---

## Feature 2: Select-and-comment ("Ask Anya" bubble)

**File:** `app/docs/page.tsx`

**What:** When user selects text in the markdown preview, show a floating bubble with a text input and "Ask Anya" button.

**Implementation:**
- Listen for `mouseup` on the preview container
- If `window.getSelection().toString().trim()` is non-empty, show bubble near selection (use `getBoundingClientRect` of the range)
- Bubble: small card with textarea (placeholder "Ask Anya...") + submit button
- On submit: POST to `https://first-viper-528.convex.site/api/tasks`
  ```json
  {
    "board": "business",
    "createdBy": "vlad",
    "assignees": ["anya"],
    "priority": "medium",
    "title": "[Doc: {doc.title}] {first 60 chars of prompt}",
    "description": "**Selected text:**\n> {selectedText}\n\n**Request:**\n{fullPrompt}\n\n**Doc path:** {doc.path}"
  }
  ```
- Show success toast "Sent to Anya ✓" for 2s then hide
- Dismiss bubble on `mousedown` outside
- Only active in preview mode (not edit mode)

**Commit:** `feat: select-and-comment sends highlighted text to Anya as task`

---

## Feature 3: Visual board (/board page)

**New files:**
- `app/board/page.tsx` — the canvas page
- `convex/board.ts` — Convex queries + mutations

**Schema addition in `convex/schema.ts`:**
```ts
boardNodes: defineTable({
  type: v.literal("note"),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  content: v.string(),
  color: v.union(v.literal("yellow"), v.literal("blue"), v.literal("green"), v.literal("pink")),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_createdAt", ["createdAt"]),
```

**convex/board.ts:**
```ts
export const list = query({ handler: async (ctx) => ctx.db.query("boardNodes").order("asc").collect() })
export const create = mutation({ args: { x, y, content, color }, handler: ... })
export const update = mutation({ args: { id, x?, y?, content?, color? }, handler: ... })
export const remove = mutation({ args: { id }, handler: ... })
```

**Canvas behavior:**
- Pan: drag on empty canvas background (cursor: grab)
- Zoom: scroll wheel (scale 0.3–3x, transform-origin center)
- Double-click on canvas: create sticky note at that position
- Sticky notes:
  - Draggable (mousedown → mousemove → mouseup, update Convex on drop)
  - Click to edit content inline (contenteditable or textarea)
  - Save content on blur
  - Hover shows: color picker (4 circles: yellow/blue/green/pink) + delete button (×)
  - Colors: yellow=#FEF3C7, blue=#DBEAFE, green=#D1FAE5, pink=#FCE7F3

**Nav:** Add "Board" link in `app/layout.tsx` next to existing nav links.

**Style:** Match existing dashboard — dark bg (`var(--bg-app)`), subtle borders, same font.

**Commit:** `feat: add /board visual canvas with sticky notes persisted to Convex`

---

## After all three:
1. Run `npx convex deploy` (answer Y to prod prompt)
2. `git push origin main`
3. Run: `openclaw system event --text "Done: ucals-board 3 features complete" --mode now`
