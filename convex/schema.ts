import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cards: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea")),
    board: v.union(v.literal("marketing"), v.literal("product")),
    column: v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    ),
    assignee: v.optional(v.union(
      v.literal("vlad"),
      v.literal("aria"),
      v.literal("maya"),
      v.literal("leo"),
      v.literal("sage"),
      v.literal("rex")
    )),
    agentNotes: v.optional(v.array(v.object({
      agent: v.string(),
      content: v.string(),
      createdAt: v.number(),
    }))),
    docPaths: v.optional(v.array(v.string())),
    order: v.number(),
  })
    .index("by_column", ["board", "column", "order"])
    .index("by_board", ["board", "order"]),

  agentJobs: defineTable({
    cardId: v.id("cards"),
    assignee: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    board: v.union(v.literal("marketing"), v.literal("product")),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("done"), v.literal("failed")),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    docPath: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_status", ["status", "createdAt"]),

  docs: defineTable({
    path: v.string(),       // e.g. "maya/landing-page-copy.md"
    title: v.string(),
    content: v.string(),    // markdown content
    agent: v.optional(v.string()),
    board: v.union(v.literal("marketing"), v.literal("product")),
    cardId: v.optional(v.id("cards")),
    updatedAt: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_board", ["board", "updatedAt"])
    .index("by_card", ["cardId"]),
});
