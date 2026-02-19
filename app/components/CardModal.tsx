"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Column = "inbox" | "in-progress" | "review" | "done" | "junk";
type Priority = "low" | "medium" | "high";
type Category = "Marketing" | "Product" | "Idea";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";
type Board = "marketing" | "product";

interface Card {
  _id: Id<"cards">;
  title: string;
  description?: string;
  notes?: string;
  priority: Priority;
  category: Category;
  column: Column;
  board: Board;
  assignee?: Assignee;
  order: number;
}

interface CardModalProps {
  card?: Card;
  defaultColumn?: Column;
  board?: Board;
  onClose: () => void;
}

const ASSIGNEES: { id: Assignee; label: string; role: string; color: string }[] = [
  { id: "vlad", label: "Vlad", role: "Owner", color: "#F5F4F2" },
  { id: "aria", label: "Aria", role: "Manager", color: "#BD632F" },
  { id: "maya", label: "Maya", role: "Copy", color: "#A4243B" },
  { id: "leo", label: "Leo", role: "Social", color: "#D8973C" },
  { id: "sage", label: "Sage", role: "SEO/GEO", color: "#5C8A6C" },
  { id: "rex", label: "Rex", role: "Paid Ads", color: "#6B8A9C" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#5C8A6C",
  medium: "#D8973C",
  high: "#A4243B",
};

const CATEGORY_COLORS: Record<Category, string> = {
  Marketing: "#BD632F",
  Product: "#273E47",
  Idea: "#6B6A68",
};

export function CardModal({ card, defaultColumn = "inbox", board, onClose }: CardModalProps) {
  const create = useMutation(api.cards.create);
  const update = useMutation(api.cards.update);
  const remove = useMutation(api.cards.remove);

  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [priority, setPriority] = useState<Priority>(card?.priority ?? "medium");
  const [category, setCategory] = useState<Category>(card?.category ?? "Marketing");
  const [column, setColumn] = useState<Column>(card?.column ?? defaultColumn);
  const [assignee, setAssignee] = useState<Assignee | undefined>(card?.assignee);
  const [saving, setSaving] = useState(false);
  const resolvedBoard: Board = board ?? card?.board ?? "marketing";

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    if (card) {
      await update({ id: card._id, title, description, notes, priority, category, column, assignee });
    } else {
      await create({ title, description, notes, priority, category, column, assignee, board: resolvedBoard });
    }
    onClose();
  }

  async function handleDelete() {
    if (!card) return;
    await remove({ id: card._id });
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-card-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "520px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 500 }}>
            {card ? "Edit card" : "New card"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "10px 12px",
            color: "var(--text-primary)",
            fontSize: "15px",
            fontWeight: 500,
            outline: "none",
            width: "100%",
          }}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "10px 12px",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            resize: "vertical",
            width: "100%",
            fontFamily: "inherit",
            lineHeight: 1.5,
          }}
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "10px 12px",
            color: "var(--text-secondary)",
            fontSize: "13px",
            outline: "none",
            resize: "vertical",
            width: "100%",
            fontFamily: "inherit",
            lineHeight: 1.5,
          }}
        />

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {/* Priority */}
          <div style={{ flex: 1, minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Priority</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: priority === p ? `1px solid ${PRIORITY_COLORS[p]}` : "1px solid var(--border-default)",
                    background: priority === p ? `${PRIORITY_COLORS[p]}22` : "var(--bg-card)",
                    color: priority === p ? PRIORITY_COLORS[p] : "var(--text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div style={{ flex: 1, minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["Marketing", "Product", "Idea"] as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: category === c ? `1px solid ${CATEGORY_COLORS[c]}` : "1px solid var(--border-default)",
                    background: category === c ? `${CATEGORY_COLORS[c]}22` : "var(--bg-card)",
                    color: category === c ? CATEGORY_COLORS[c] : "var(--text-muted)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assign to</label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {ASSIGNEES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAssignee(assignee === a.id ? undefined : a.id)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: assignee === a.id ? `1px solid ${a.color}` : "1px solid var(--border-default)",
                  background: assignee === a.id ? `${a.color}22` : "var(--bg-card)",
                  color: assignee === a.id ? a.color : "var(--text-muted)",
                }}
              >
                {a.label} <span style={{ opacity: 0.6, fontSize: "10px" }}>{a.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column */}
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Column</label>
          <select
            value={column}
            onChange={(e) => setColumn(e.target.value as Column)}
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          >
            <option value="inbox">Inbox</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="junk">Junk</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px" }}>
          {card ? (
            <button
              onClick={handleDelete}
              style={{
                background: "none",
                border: "1px solid var(--cranberry)",
                borderRadius: "8px",
                padding: "8px 16px",
                color: "var(--cranberry)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                padding: "8px 16px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              style={{
                background: "var(--text-primary)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 20px",
                color: "var(--bg-app)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: title.trim() ? "pointer" : "not-allowed",
                opacity: title.trim() ? 1 : 0.4,
              }}
            >
              {saving ? "Saving…" : card ? "Save" : "Add card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
