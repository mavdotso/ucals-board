import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const boardValidator = v.union(v.literal("marketing"), v.literal("product"));
const platformValidator = v.union(v.literal("x"), v.literal("linkedin"));
const statusValidator = v.union(
  v.literal("idea"),
  v.literal("draft"),
  v.literal("ready"),
  v.literal("scheduled"),
  v.literal("published")
);

/** List posts for a board, optionally filtered by month range */
export const list = query({
  args: {
    board: boardValidator,
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("posts")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("asc")
      .collect();
    if (args.startTime !== undefined && args.endTime !== undefined) {
      posts = posts.filter(
        (p) =>
          p.scheduledAt !== undefined &&
          p.scheduledAt >= args.startTime! &&
          p.scheduledAt < args.endTime!
      );
    }
    return posts;
  },
});

/** List unscheduled backlog posts (idea/draft/ready, no scheduledAt) */
export const listBacklog = query({
  args: { board: boardValidator },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("desc")
      .collect();
    return posts.filter(
      (p) =>
        p.scheduledAt === undefined &&
        (p.status === "idea" || p.status === "draft" || p.status === "ready")
    );
  },
});

/** List posts by status for a board */
export const listByStatus = query({
  args: { board: boardValidator, status: statusValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_status", (q) =>
        q.eq("board", args.board).eq("status", args.status)
      )
      .order("asc")
      .collect();
  },
});

/** List all posts for a board (used by kanban) */
export const listAll = query({
  args: { board: boardValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("asc")
      .collect();
  },
});

/** Create a new post */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    platform: platformValidator,
    status: statusValidator,
    scheduledAt: v.optional(v.number()),
    board: boardValidator,
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("posts", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update a post */
export const update = mutation({
  args: {
    id: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    platform: v.optional(platformValidator),
    status: v.optional(statusValidator),
    scheduledAt: v.optional(v.number()),
    board: v.optional(boardValidator),
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

/** Delete a post */
export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/** Schedule a post — set scheduledAt and status to scheduled */
export const schedule = mutation({
  args: {
    id: v.id("posts"),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      updatedAt: Date.now(),
    });
  },
});

/** Unschedule a post — clear scheduledAt, revert to draft */
export const unschedule = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(args.id, {
      scheduledAt: undefined,
      status: "draft",
      updatedAt: Date.now(),
    });
  },
});
