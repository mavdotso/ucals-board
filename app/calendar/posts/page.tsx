"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PostModal } from "../../components/PostModal";
import { Nav } from "@/app/components/Nav";

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

const STATUSES: PostStatus[] = ["idea", "draft", "ready", "scheduled", "published"];

const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  ready: "Ready",
  scheduled: "Scheduled",
  published: "Published",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  idea: "#6B6A68",
  draft: "#D8973C",
  ready: "#5C8A6C",
  scheduled: "#6B8A9C",
  published: "#A4243B",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  x: "#1DA1F2",
  linkedin: "#0A66C2",
};

export default function PostsKanbanPage() {
  const [activeBoard, setActiveBoard] = useState<Board>("marketing");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [adding, setAdding] = useState(false);

  const updatePost = useMutation(api.posts.update);

  const posts = useQuery(api.posts.listAll, { board: activeBoard }) ?? [];

  const postsByStatus = useMemo(() => {
    const map: Record<PostStatus, Post[]> = {
      idea: [],
      draft: [],
      ready: [],
      scheduled: [],
      published: [],
    };
    for (const post of posts) {
      map[post.status as PostStatus].push(post as Post);
    }
    // Sort scheduled by scheduledAt
    map.scheduled.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    return map;
  }, [posts]);

  async function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as PostStatus;
    await updatePost({ id: draggableId as Id<"posts">, status: newStatus });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <Nav active="/calendar" right={<>
        {(["marketing", "product"] as Board[]).map((b) => (
          <button key={b} onClick={() => setActiveBoard(b)} style={{
            background: activeBoard === b ? "var(--bg-card-elevated)" : "none",
            border: activeBoard === b ? "1px solid var(--border-default)" : "1px solid transparent",
            borderRadius: "6px", padding: "4px 12px",
            color: activeBoard === b ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "12px", fontWeight: activeBoard === b ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
          }}>{b}</button>
        ))}
        <button onClick={() => setAdding(true)} style={{ background: "var(--text-primary)", border: "none", borderRadius: "7px", padding: "6px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          + New post
        </button>
      </>} />

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "20px 24px" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "flex", gap: "12px", height: "100%", alignItems: "stretch" }}>
            {STATUSES.map((status) => (
              <div
                key={status}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "260px",
                  minWidth: "260px",
                  maxHeight: "100%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: "12px 14px 10px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: STATUS_COLORS[status],
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "1px 7px",
                      }}
                    >
                      {postsByStatus[status].length}
                    </span>
                  </div>
                  {status === "idea" && (
                    <button
                      onClick={() => setAdding(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "18px",
                        lineHeight: 1,
                        padding: "0 2px",
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Add post"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Cards */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minHeight: "80px",
                        overflowY: "auto",
                        background: snapshot.isDraggingOver ? "rgba(255,255,255,0.02)" : "transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      {postsByStatus[status].map((post, index) => (
                        <Draggable key={post._id} draggableId={post._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setEditingPost(post)}
                              style={{
                                background: snapshot.isDragging
                                  ? "var(--bg-card-elevated)"
                                  : "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "8px",
                                padding: "11px 12px",
                                cursor: "pointer",
                                userSelect: "none",
                                boxShadow: snapshot.isDragging
                                  ? "0 8px 24px rgba(0,0,0,0.4)"
                                  : "none",
                                transition: "box-shadow 0.15s, background 0.15s",
                                ...provided.draggableProps.style,
                              }}
                            >
                              {/* Platform color bar */}
                              <div
                                style={{
                                  height: "2px",
                                  borderRadius: "2px",
                                  background: PLATFORM_COLORS[post.platform],
                                  marginBottom: "9px",
                                  opacity: 0.8,
                                }}
                              />

                              {/* Platform icon + title */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "6px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: PLATFORM_COLORS[post.platform],
                                    flexShrink: 0,
                                  }}
                                >
                                  {post.platform === "x" ? "𝕏" : "in"}
                                </span>
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--text-primary)",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {post.title}
                                </span>
                              </div>

                              {/* Content preview */}
                              {post.content && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text-muted)",
                                    lineHeight: 1.4,
                                    marginBottom: "8px",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {post.content.slice(0, 80)}
                                  {post.content.length > 80 ? "..." : ""}
                                </div>
                              )}

                              {/* Footer: status + date */}
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: `${PLATFORM_COLORS[post.platform]}18`,
                                    color: PLATFORM_COLORS[post.platform],
                                  }}
                                >
                                  {post.platform === "x" ? "X" : "LinkedIn"}
                                </span>
                                {post.scheduledAt && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {new Date(post.scheduledAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Modals */}
      {editingPost && (
        <PostModal post={editingPost} board={activeBoard} onClose={() => setEditingPost(null)} />
      )}
      {adding && <PostModal board={activeBoard} onClose={() => setAdding(false)} />}
    </div>
  );
}
