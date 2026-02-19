import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cards: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.union(v.literal("Marketing"), v.literal("Product"), v.literal("Idea")),
    column: v.union(
      v.literal("inbox"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("junk")
    ),
    order: v.number(),
  }).index("by_column", ["column", "order"]),
});
