import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CATEGORY = v.union(
  v.literal("analytics"), v.literal("marketing"), v.literal("seo"),
  v.literal("email"), v.literal("social"), v.literal("dev"),
  v.literal("design"), v.literal("ai"), v.literal("other")
);

const STATUS = v.union(
  v.literal("active"), v.literal("trial"),
  v.literal("needs-setup"), v.literal("cancelled")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tools").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: CATEGORY,
    status: STATUS,
    url: v.optional(v.string()),
    cost: v.optional(v.string()),
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("annual"), v.literal("free"), v.literal("one-time"))),
    accessNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tools", {
      ...args,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tools"),
    name: v.optional(v.string()),
    category: v.optional(CATEGORY),
    status: v.optional(STATUS),
    url: v.optional(v.string()),
    cost: v.optional(v.string()),
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("annual"), v.literal("free"), v.literal("one-time"))),
    accessNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
