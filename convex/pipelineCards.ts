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

// Strip heavy base64 fields (sizeImages) from all cards in a pipeline
export const stripHeavyFields = mutation({
  args: { pipelineId: v.string() },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("pipelineCards")
      .withIndex("by_pipeline", (q) => q.eq("pipelineId", args.pipelineId))
      .collect();
    let count = 0;
    for (const card of cards) {
      const fields = { ...(card.fields ?? {}) };
      if ("sizeImages" in fields) {
        delete fields.sizeImages;
        await ctx.db.patch(card._id, { fields, updatedAt: Date.now() });
        count++;
      }
    }
    return { stripped: count };
  },
});

// Get one card ID at a time using a cursor — avoids reading heavy fields
export const getNextHeavyCard = query({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("pipelineCards")
      .paginate({ cursor: args.cursor ?? null, numItems: 1 });
    const card = result.page[0];
    if (!card) return { id: null, cursor: result.continueCursor, isDone: result.isDone };
    return {
      id: card._id,
      hasSizeImages: "sizeImages" in (card.fields ?? {}),
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Strip sizeImages from a single card by ID
export const stripCard = mutation({
  args: { id: v.id("pipelineCards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card) return { skipped: true };
    const fields = { ...(card.fields ?? {}) };
    if ("sizeImages" in fields) {
      delete fields.sizeImages;
      await ctx.db.patch(args.id, { fields, updatedAt: Date.now() });
      return { stripped: true };
    }
    return { stripped: false };
  },
});

// List cards without heavy base64 fields
export const listLite = query({
  args: { pipelineId: v.string() },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("pipelineCards")
      .withIndex("by_pipeline", (q) => q.eq("pipelineId", args.pipelineId))
      .collect();
    return cards.map(c => {
      const fields = { ...(c.fields ?? {}) };
      delete fields.sizeImages;
      return { ...c, fields };
    });
  },
});
