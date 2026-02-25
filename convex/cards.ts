import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("board", "marketing"))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    column: v.optional(v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("blocked"), v.literal("junk"))),
    assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("board", "marketing"))
      .order("desc")
      .first();
    const order = existing ? existing.order + 1 : 0;
    return await ctx.db.insert("cards", {
      title: args.title,
      description: args.description,
      column: args.column ?? "inbox",
      assignee: args.assignee,
      board: "marketing",
      priority: "medium",
      category: "Marketing",
      order,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    column: v.optional(v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("blocked"), v.literal("junk"))),
    assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
    order: v.optional(v.number()),
    docPaths: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const attachDoc = mutation({
  args: { id: v.id("cards"), docPath: v.string() },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");
    const paths = card.docPaths ?? [];
    if (!paths.includes(args.docPath)) {
      await ctx.db.patch(args.id, { docPaths: [...paths, args.docPath] });
    }
  },
});

// Keep for backward compat — agents use this
export const addAgentNote = mutation({
  args: {
    id: v.id("cards"),
    agent: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");
    const notes = card.agentNotes ?? [];
    await ctx.db.patch(args.id, {
      agentNotes: [...notes, { agent: args.agent, content: args.content, createdAt: Date.now() }],
    });
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
    newColumn: v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("blocked"), v.literal("junk")),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { column: args.newColumn, order: args.newOrder });
  },
});

export const createBulk = mutation({
  args: {
    cards: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("board", "marketing"))
      .order("desc")
      .first();
    let order = existing ? existing.order + 1 : 0;
    const ids = [];
    for (const card of args.cards) {
      const id = await ctx.db.insert("cards", {
        ...card,
        column: "inbox",
        board: "marketing",
        priority: "medium",
        category: "Marketing",
        order: order++,
      });
      ids.push(id);
    }
    return ids;
  },
});
