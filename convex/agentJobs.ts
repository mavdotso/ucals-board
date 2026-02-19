import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple job queue: board enqueues, local runner polls + claims
export const enqueue = mutation({
  args: {
    cardId: v.id("cards"),
    assignee: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    board: v.union(v.literal("marketing"), v.literal("product")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentJobs", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const poll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .first();
  },
});

export const claim = mutation({
  args: { id: v.id("agentJobs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "running", startedAt: Date.now() });
  },
});

export const complete = mutation({
  args: {
    id: v.id("agentJobs"),
    docPath: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.error ? "failed" : "done",
      completedAt: Date.now(),
      docPath: args.docPath,
      error: args.error,
    });
  },
});
