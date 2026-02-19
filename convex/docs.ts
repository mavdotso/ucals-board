import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { board: v.union(v.literal("marketing"), v.literal("product")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("docs") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getByPath = query({
  args: { path: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();
  },
});

export const byCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    path: v.string(),
    title: v.string(),
    content: v.string(),
    agent: v.optional(v.string()),
    board: v.union(v.literal("marketing"), v.literal("product")),
    cardId: v.optional(v.id("cards")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("docs")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("docs", { ...args, updatedAt: Date.now() });
    }
  },
});

export const save = mutation({
  args: {
    id: v.id("docs"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("docs") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
});
