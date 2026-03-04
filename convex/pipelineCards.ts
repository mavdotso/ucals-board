import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { pipelineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipelineCards")
      .withIndex("by_pipeline", (q) => q.eq("pipelineId", args.pipelineId))
      .collect();
  },
});

export const create = mutation({
  args: {
    pipelineId: v.string(),
    column: v.string(),
    title: v.string(),
    fields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipelineCards", {
      pipelineId: args.pipelineId,
      column: args.column,
      title: args.title,
      fields: args.fields ?? {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("pipelineCards"),
    column: v.optional(v.string()),
    title: v.optional(v.string()),
    fields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, fields, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };
    // Merge fields instead of replacing — preserves hook/icp/angle/copy when only updating sizes
    if (fields !== undefined) {
      const existing = await ctx.db.get(id);
      patch.fields = { ...(existing?.fields ?? {}), ...fields };
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("pipelineCards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
