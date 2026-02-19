import { query } from "./_generated/server";
import { v } from "convex/values";

export const global = query({
  args: { q: v.string(), board: v.union(v.literal("marketing"), v.literal("product")) },
  handler: async (ctx, args) => {
    const q = args.q.toLowerCase().trim();
    if (!q) return { cards: [], docs: [] };

    const [cards, docs] = await Promise.all([
      ctx.db.query("cards").withIndex("by_board", (i) => i.eq("board", args.board)).collect(),
      ctx.db.query("docs").withIndex("by_board", (i) => i.eq("board", args.board)).collect(),
    ]);

    const matchCards = cards.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q)
    ).slice(0, 8);

    const matchDocs = docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.path.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    ).slice(0, 8);

    return { cards: matchCards, docs: matchDocs };
  },
});
