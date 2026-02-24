"use client";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PostModal } from "../components/PostModal";
import { Nav } from "@/app/components/Nav";

type ViewMode = "month" | "week" | "3day";
type Platform = "x" | "linkedin";
type PostStatus = "idea" | "draft" | "ready" | "scheduled" | "published";
type Board = "marketing";

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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay();
  // Adjust so Monday = 0
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(year, month, 1 - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

function getWeekDays(centerDate: Date): Date[] {
  const d = new Date(centerDate);
  const dayOfWeek = d.getDay();
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }
  return days;
}

function get3DayDays(centerDate: Date): Date[] {
  const d = new Date(centerDate);
  return [
    new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1),
    new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
  ];
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatWeekRange(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${first.toLocaleDateString("en-US", opts)} — ${last.toLocaleDateString("en-US", opts)}, ${last.getFullYear()}`;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [activeBoard, setActiveBoard] = useState<Board>("marketing");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [creatingForDate, setCreatingForDate] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  const scheduleMutation = useMutation(api.posts.schedule);

  // Compute visible range for query
  const visibleRange = useMemo(() => {
    if (viewMode === "month") {
      const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
      return {
        start: startOfDay(days[0]).getTime(),
        end: startOfDay(new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1)).getTime(),
      };
    } else if (viewMode === "week") {
      const days = getWeekDays(currentDate);
      return {
        start: startOfDay(days[0]).getTime(),
        end: startOfDay(new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate() + 1)).getTime(),
      };
    } else {
      const days = get3DayDays(currentDate);
      return {
        start: startOfDay(days[0]).getTime(),
        end: startOfDay(new Date(days[2].getFullYear(), days[2].getMonth(), days[2].getDate() + 1)).getTime(),
      };
    }
  }, [viewMode, currentDate]);

  const posts = useQuery(api.posts.list, {
    board: activeBoard,
    startTime: visibleRange.start,
    endTime: visibleRange.end,
  }) ?? [];

  const backlogPosts = useQuery(api.posts.listBacklog, { board: activeBoard }) ?? [];

  const today = useMemo(() => startOfDay(new Date()), []);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (post.scheduledAt) {
        const d = new Date(post.scheduledAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(post as Post);
      }
    }
    return map;
  }, [posts]);

  function getPostsForDay(date: Date): Post[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return postsByDay.get(key) ?? [];
  }

  function navigate(direction: -1 | 1) {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + direction);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7 * direction);
    } else {
      d.setDate(d.getDate() + 3 * direction);
    }
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const handleDrop = useCallback(
    async (date: Date) => {
      if (!draggedPostId) return;
      const noon = new Date(date);
      noon.setHours(12, 0, 0, 0);
      await scheduleMutation({ id: draggedPostId as Id<"posts">, scheduledAt: noon.getTime() });
      setDraggedPostId(null);
    },
    [draggedPostId, scheduleMutation]
  );

  // Compute days for current view
  const viewDays = useMemo(() => {
    if (viewMode === "month") return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    if (viewMode === "week") return getWeekDays(currentDate);
    return get3DayDays(currentDate);
  }, [viewMode, currentDate]);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return formatMonthYear(currentDate);
    return formatWeekRange(viewDays);
  }, [viewMode, currentDate, viewDays]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <Nav active="/calendar" right={<>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", padding: "4px 12px" }}>Marketing</span>
          <span style={{ color: "var(--border-default)" }}>|</span>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
          <button onClick={goToday} style={{ ...navBtnStyle, fontSize: "12px", padding: "4px 10px" }}>Today</button>
          <button onClick={() => navigate(1)} style={navBtnStyle}>›</button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", minWidth: "160px", textAlign: "center" }}>{headerLabel}</span>
          <div style={{ display: "flex", gap: "2px", background: "var(--bg-card)", borderRadius: "7px", border: "1px solid var(--border-subtle)", padding: "2px" }}>
            {(["month", "week", "3day"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: "4px 10px", borderRadius: "5px", fontSize: "12px",
                fontWeight: viewMode === v ? 600 : 400, cursor: "pointer", border: "none",
                background: viewMode === v ? "var(--bg-card-elevated)" : "transparent",
                color: viewMode === v ? "var(--text-primary)" : "var(--text-muted)",
              }}>{v === "3day" ? "3 days" : v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "7px", padding: "4px 10px", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>
            {sidebarOpen ? "Hide backlog" : "Backlog"}
          </button>
          <button onClick={() => setCreating(true)} style={{ background: "var(--text-primary)", border: "none", borderRadius: "7px", padding: "6px 14px", color: "var(--bg-app)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            + New post
          </button>
      </>} />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Day headers */}
          {viewMode === "month" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid var(--border-subtle)" }}>
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  style={{
                    padding: "8px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {viewMode === "month" ? (
            <MonthGrid
              days={viewDays}
              currentMonth={currentDate.getMonth()}
              today={today}
              getPostsForDay={getPostsForDay}
              onClickDay={(date) => { setCreatingForDate(date.getTime() + 12 * 60 * 60 * 1000); }}
              onClickPost={(post) => setEditingPost(post)}
              onDrop={handleDrop}
              draggedPostId={draggedPostId}
            />
          ) : (
            <ColumnView
              days={viewDays}
              today={today}
              getPostsForDay={getPostsForDay}
              onClickDay={(date) => { setCreatingForDate(date.getTime() + 12 * 60 * 60 * 1000); }}
              onClickPost={(post) => setEditingPost(post)}
              onDrop={handleDrop}
              draggedPostId={draggedPostId}
            />
          )}
        </div>

        {/* Backlog sidebar */}
        {sidebarOpen && (
          <div
            style={{
              width: "270px",
              minWidth: "270px",
              borderLeft: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px 10px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                Backlog
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "1px 7px",
                }}
              >
                {backlogPosts.length}
              </span>
            </div>
            <div style={{ padding: "8px 10px 4px", fontSize: "11px", color: "var(--text-muted)" }}>
              Drag to calendar to schedule
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {backlogPosts.map((post) => (
                <div
                  key={post._id}
                  draggable
                  onDragStart={() => setDraggedPostId(post._id)}
                  onDragEnd={() => setDraggedPostId(null)}
                  onClick={() => setEditingPost(post as Post)}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "9px 10px",
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: PLATFORM_COLORS[post.platform as Platform],
                      }}
                    >
                      {post.platform === "x" ? "𝕏" : "in"}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {post.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: `${STATUS_COLORS[post.status as PostStatus]}22`,
                      color: STATUS_COLORS[post.status as PostStatus],
                      textTransform: "capitalize",
                    }}
                  >
                    {post.status}
                  </span>
                </div>
              ))}
              {backlogPosts.length === 0 && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                  No unscheduled posts
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingPost && (
        <PostModal post={editingPost} board={activeBoard} onClose={() => setEditingPost(null)} />
      )}
      {creatingForDate && (
        <PostModal
          defaultDate={creatingForDate}
          board={activeBoard}
          onClose={() => setCreatingForDate(null)}
        />
      )}
      {creating && <PostModal board={activeBoard} onClose={() => setCreating(false)} />}
    </div>
  );
}

/* --- Sub-components --- */

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border-default)",
  borderRadius: "6px",
  padding: "4px 8px",
  color: "var(--text-secondary)",
  fontSize: "16px",
  cursor: "pointer",
  lineHeight: 1,
};

function MonthGrid({
  days,
  currentMonth,
  today,
  getPostsForDay,
  onClickDay,
  onClickPost,
  onDrop,
  draggedPostId,
}: {
  days: Date[];
  currentMonth: number;
  today: Date;
  getPostsForDay: (d: Date) => Post[];
  onClickDay: (d: Date) => void;
  onClickPost: (p: Post) => void;
  onDrop: (d: Date) => void;
  draggedPostId: string | null;
}) {
  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            flex: 1,
            minHeight: "100px",
          }}
        >
          {row.map((day, ci) => {
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const dayPosts = getPostsForDay(day);

            return (
              <DayCell
                key={ci}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                posts={dayPosts}
                compact
                onClickDay={onClickDay}
                onClickPost={onClickPost}
                onDrop={onDrop}
                isDragTarget={!!draggedPostId}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ColumnView({
  days,
  today,
  getPostsForDay,
  onClickDay,
  onClickPost,
  onDrop,
  draggedPostId,
}: {
  days: Date[];
  today: Date;
  getPostsForDay: (d: Date) => Post[];
  onClickDay: (d: Date) => void;
  onClickPost: (p: Post) => void;
  onDrop: (d: Date) => void;
  draggedPostId: string | null;
}) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const dayPosts = getPostsForDay(day);
        const dayLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRight: i < days.length - 1 ? "1px solid var(--border-subtle)" : "none",
              overflow: "hidden",
            }}
          >
            {/* Column header */}
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                textAlign: "center",
                background: isToday ? "rgba(29,161,242,0.06)" : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#1DA1F2" : "var(--text-secondary)",
                }}
              >
                {dayLabel}
              </span>
            </div>
            {/* Posts */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDrop(day); }}
              onClick={() => onClickDay(day)}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                cursor: "pointer",
                background: draggedPostId ? "rgba(255,255,255,0.01)" : "transparent",
              }}
            >
              {dayPosts.map((post) => (
                <div
                  key={post._id}
                  onClick={(e) => { e.stopPropagation(); onClickPost(post); }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "9px 10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: PLATFORM_COLORS[post.platform] }}>
                      {post.platform === "x" ? "𝕏" : "in"}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {post.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: `${STATUS_COLORS[post.status]}22`,
                      color: STATUS_COLORS[post.status],
                      textTransform: "capitalize",
                    }}
                  >
                    {post.status}
                  </span>
                </div>
              ))}
              {dayPosts.length === 0 && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                  +
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayCell({
  day,
  isCurrentMonth,
  isToday,
  posts,
  compact,
  onClickDay,
  onClickPost,
  onDrop,
  isDragTarget,
}: {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: Post[];
  compact: boolean;
  onClickDay: (d: Date) => void;
  onClickPost: (p: Post) => void;
  onDrop: (d: Date) => void;
  isDragTarget: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(day); }}
      onClick={() => onClickDay(day)}
      style={{
        borderRight: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "4px 6px",
        minHeight: "80px",
        cursor: "pointer",
        opacity: isCurrentMonth ? 1 : 0.35,
        overflow: "hidden",
        minWidth: 0,
        background: dragOver
          ? "rgba(29,161,242,0.08)"
          : isToday
            ? "rgba(29,161,242,0.04)"
            : "transparent",
        transition: "background 0.1s",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: isToday ? 700 : 400,
          color: isToday ? "#1DA1F2" : "var(--text-secondary)",
          marginBottom: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: isToday ? "22px" : "auto",
          height: isToday ? "22px" : "auto",
          borderRadius: isToday ? "50%" : "none",
          background: isToday ? "rgba(29,161,242,0.15)" : "transparent",
        }}
      >
        {day.getDate()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", minWidth: 0 }}>
        {posts.slice(0, compact ? 3 : 10).map((post) => (
          <div
            key={post._id}
            onClick={(e) => { e.stopPropagation(); onClickPost(post); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 5px",
              borderRadius: "4px",
              background: `${PLATFORM_COLORS[post.platform]}15`,
              cursor: "pointer",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: "10px", fontWeight: 700, color: PLATFORM_COLORS[post.platform], flexShrink: 0 }}>
              {post.platform === "x" ? "𝕏" : "in"}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {post.title}
            </span>
          </div>
        ))}
        {compact && posts.length > 3 && (
          <span style={{ fontSize: "9px", color: "var(--text-muted)", padding: "0 5px" }}>
            +{posts.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}
