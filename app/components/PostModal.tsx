"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Platform = "x" | "linkedin";
type PostStatus = "idea" | "draft" | "ready" | "scheduled" | "published";
type Board = "marketing" | "product";

interface Post {
  _id: Id<"posts">;
  title: string;
  content: string;
  platform: Platform;
  status: PostStatus;
  scheduledAt?: number;
  board: Board;
  createdBy?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

interface PostModalProps {
  post?: Post;
  defaultDate?: number;
  board?: Board;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<Platform, string> = {
  x: "#1DA1F2",
  linkedin: "#0A66C2",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  idea: "#6B6A68",
  draft: "#D8973C",
  ready: "#5C8A6C",
  scheduled: "#6B8A9C",
  published: "#A4243B",
};

const CHAR_LIMITS: Record<Platform, number> = {
  x: 280,
  linkedin: 3000,
};

export function PostModal({ post, defaultDate, board, onClose }: PostModalProps) {
  const create = useMutation(api.posts.create);
  const update = useMutation(api.posts.update);
  const remove = useMutation(api.posts.remove);

  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [platform, setPlatform] = useState<Platform>(post?.platform ?? "x");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "idea");
  const [scheduledAt, setScheduledAt] = useState<string>(
    post?.scheduledAt
      ? toLocalDatetime(post.scheduledAt)
      : defaultDate
        ? toLocalDatetime(defaultDate)
        : ""
  );
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  const resolvedBoard: Board = board ?? post?.board ?? "marketing";
  const charLimit = CHAR_LIMITS[platform];
  const charCount = content.length;
  const overLimit = charCount > charLimit;

  function toLocalDatetime(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const scheduledTs = scheduledAt ? new Date(scheduledAt).getTime() : undefined;
    const effectiveStatus = scheduledTs && status !== "published" ? "scheduled" : status;

    if (post) {
      await update({
        id: post._id,
        title,
        content,
        platform,
        status: effectiveStatus,
        scheduledAt: scheduledTs,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      });
    } else {
      await create({
        title,
        content,
        platform,
        status: effectiveStatus,
        scheduledAt: scheduledTs,
        board: resolvedBoard,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!post) return;
    await remove({ id: post._id });
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-card-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "560px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 500 }}>
            {post ? "Edit post" : "New post"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Title */}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
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

        {/* Platform toggle */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Platform
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["x", "linkedin"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border:
                    platform === p
                      ? `1px solid ${PLATFORM_COLORS[p]}`
                      : "1px solid var(--border-default)",
                  background:
                    platform === p ? `${PLATFORM_COLORS[p]}22` : "var(--bg-card)",
                  color: platform === p ? PLATFORM_COLORS[p] : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "14px" }}>{p === "x" ? "𝕏" : "in"}</span>
                {p === "x" ? "X / Twitter" : "LinkedIn"}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Status
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(["idea", "draft", "ready", "scheduled", "published"] as PostStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border:
                    status === s
                      ? `1px solid ${STATUS_COLORS[s]}`
                      : "1px solid var(--border-default)",
                  background:
                    status === s ? `${STATUS_COLORS[s]}22` : "var(--bg-card)",
                  color: status === s ? STATUS_COLORS[s] : "var(--text-muted)",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduled date */}
        {(status === "scheduled" || scheduledAt) && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Scheduled date & time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <label
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Content
            </label>
            <span
              style={{
                fontSize: "11px",
                color: overLimit ? "#A4243B" : "var(--text-muted)",
                fontWeight: overLimit ? 600 : 400,
              }}
            >
              {charCount} / {charLimit}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content…"
            rows={6}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${overLimit ? "#A4243B" : "var(--border-default)"}`,
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
        </div>

        {/* Tags */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Tags (comma-separated)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. launch, product, announcement"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px" }}>
          {post ? (
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
          ) : (
            <div />
          )}
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
              {saving ? "Saving..." : post ? "Save" : "Create post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
