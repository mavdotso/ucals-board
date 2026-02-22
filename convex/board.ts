import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("boardNodes").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    x: v.number(),
    y: v.number(),
    content: v.string(),
    color: v.union(v.literal("yellow"), v.literal("blue"), v.literal("green"), v.literal("pink")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("boardNodes", {
      type: "note",
      x: args.x,
      y: args.y,
      width: 200,
      height: 150,
      content: args.content,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("boardNodes"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    content: v.optional(v.string()),
    color: v.optional(v.union(v.literal("yellow"), v.literal("blue"), v.literal("green"), v.literal("pink"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("boardNodes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});