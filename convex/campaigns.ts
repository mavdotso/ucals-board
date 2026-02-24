import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("campaigns").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", {
      name: args.name,
      color: args.color,
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const filtered = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    // Delete all tags for this campaign too
    const tags = await ctx.db
      .query("campaignTags")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();
    for (const tag of tags) await ctx.db.delete(tag._id);
    await ctx.db.delete(args.id);
  },
});

// ─── Tags ────────────────────────────────────────────────────────────────────

export const listTags = query({
  handler: async (ctx) => {
    return await ctx.db.query("campaignTags").collect();
  },
});

export const tagItem = mutation({
  args: {
    itemId: v.string(),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    // Check if already tagged
    const existing = await ctx.db
      .query("campaignTags")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("campaignTags", {
      itemId: args.itemId,
      campaignId: args.campaignId,
      createdAt: Date.now(),
    });
  },
});

export const untagItem = mutation({
  args: {
    itemId: v.string(),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("campaignTags")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
