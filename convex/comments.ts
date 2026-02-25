import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
  },
});

export const add = mutation({
  args: {
    cardId: v.id("cards"),
    author: v.string(),
    role: v.union(v.literal("human"), v.literal("agent")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      cardId: args.cardId,
      author: args.author,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const count = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
    return comments.length;
  },
});
