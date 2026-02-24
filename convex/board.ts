import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("boardNodes").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    type: v.optional(v.union(
      v.literal("note"),
      v.literal("text"),
      v.literal("rect"),
      v.literal("ellipse"),
      v.literal("arrow")
    )),
    x: v.number(),
    y: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    content: v.optional(v.string()),
    color: v.optional(v.union(
      v.literal("yellow"),
      v.literal("blue"),
      v.literal("green"),
      v.literal("pink"),
      v.literal("white"),
      v.literal("gray")
    )),
    strokeColor: v.optional(v.string()),
    fillColor: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    x2: v.optional(v.number()),
    y2: v.optional(v.number()),
    fontSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const type = args.type ?? "note";
    const defaults: Record<string, { w: number; h: number }> = {
      note: { w: 200, h: 150 },
      text: { w: 200, h: 50 },
      rect: { w: 160, h: 100 },
      ellipse: { w: 160, h: 100 },
      arrow: { w: 0, h: 0 },
    };
    const d = defaults[type];
    return await ctx.db.insert("boardNodes", {
      type,
      x: args.x,
      y: args.y,
      width: args.width ?? d.w,
      height: args.height ?? d.h,
      content: args.content ?? "",
      color: args.color,
      strokeColor: args.strokeColor,
      fillColor: args.fillColor,
      strokeWidth: args.strokeWidth,
      x2: args.x2,
      y2: args.y2,
      fontSize: args.fontSize,
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
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    content: v.optional(v.string()),
    color: v.optional(v.union(
      v.literal("yellow"),
      v.literal("blue"),
      v.literal("green"),
      v.literal("pink"),
      v.literal("white"),
      v.literal("gray")
    )),
    strokeColor: v.optional(v.string()),
    fillColor: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    x2: v.optional(v.number()),
    y2: v.optional(v.number()),
    fontSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    return await ctx.db.patch(id, {
      ...filtered,
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

export const removeMany = mutation({
  args: {
    ids: v.array(v.id("boardNodes")),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});
