import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

type Board = "marketing" | "product";
type Column = "inbox" | "in-progress" | "review" | "done" | "junk";
type Assignee = "vlad" | "aria" | "maya" | "leo" | "sage" | "rex";

export const listAll = query({
  args: { board: v.union(v.literal("marketing"), v.literal("product")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea")),
    board: v.union(v.literal("marketing"), v.literal("product")),
    column: v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("junk")),
    assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .order("desc")
      .first();
    const order = existing ? existing.order + 1 : 0;
    return await ctx.db.insert("cards", { ...args, agentNotes: [], order });
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
    column: v.optional(v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("junk")),),
    assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
    order: v.optional(v.number()),
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
    newColumn: v.union(v.literal("inbox"), v.literal("in-progress"), v.literal("review"), v.literal("done"), v.literal("junk")),
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
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      assignee: v.optional(v.union(v.literal("vlad"), v.literal("aria"), v.literal("maya"), v.literal("leo"), v.literal("sage"), v.literal("rex"))),
      category: v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea")),
      board: v.union(v.literal("marketing"), v.literal("product")),
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
        agentNotes: [],
        order: order++,
      });
      ids.push(id);
    }
    return ids;
  },
});
