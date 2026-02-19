import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByColumn = query({
  args: {
    column: v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_column", (q) => q.eq("column", args.column))
      .order("asc")
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("cards").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea")),
    column: v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_column", (q) => q.eq("column", args.column))
      .order("desc")
      .first();
    const order = existing ? existing.order + 1 : 0;
    return await ctx.db.insert("cards", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    category: v.optional(v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea"))),
    column: v.optional(v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    )),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const moveCard = mutation({
  args: {
    id: v.id("cards"),
    newColumn: v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    ),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      column: args.newColumn,
      order: args.newOrder,
    });
  },
});
