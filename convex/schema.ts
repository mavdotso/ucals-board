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
      v.literal("blocked"),
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

  tools: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("analytics"),
      v.literal("marketing"),
      v.literal("seo"),
      v.literal("email"),
      v.literal("social"),
      v.literal("dev"),
      v.literal("design"),
      v.literal("ai"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("needs-setup"),
      v.literal("cancelled")
    ),
    url: v.optional(v.string()),
    cost: v.optional(v.string()),         // e.g. "$29/mo" or "free"
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("annual"), v.literal("free"), v.literal("one-time"))),
    accessNotes: v.optional(v.string()),  // who has access, credentials location
    notes: v.optional(v.string()),
    addedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

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

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    platform: v.union(v.literal("x"), v.literal("linkedin")),
    status: v.union(
      v.literal("idea"),
      v.literal("draft"),
      v.literal("ready"),
      v.literal("scheduled"),
      v.literal("published")
    ),
    scheduledAt: v.optional(v.number()),
    board: v.union(v.literal("marketing"), v.literal("product")),
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board", ["board", "scheduledAt"])
    .index("by_status", ["board", "status"])
    .index("by_scheduled", ["scheduledAt"]),

  pipelines: defineTable({
    name: v.string(),
    status: v.union(v.literal("running"), v.literal("complete"), v.literal("failed")),
    inputUrl: v.string(),
    competitorName: v.optional(v.string()),
    stages: v.array(v.object({
      stage: v.number(),
      name: v.string(),
      agent: v.string(),
      status: v.union(v.literal("idle"), v.literal("running"), v.literal("complete"), v.literal("failed")),
      jobId: v.optional(v.string()),
      docPath: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  campaigns: defineTable({
    name: v.string(),
    color: v.string(),
    archived: v.boolean(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  campaignTags: defineTable({
    itemId: v.string(),
    campaignId: v.id("campaigns"),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_campaign", ["campaignId"]),

  comments: defineTable({
    cardId: v.id("cards"),
    author: v.string(),           // "vlad" | "anya" | "maya" | etc
    role: v.union(v.literal("human"), v.literal("agent")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_card", ["cardId", "createdAt"]),

  boardNodes: defineTable({
    type: v.literal("note"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    content: v.string(),
    color: v.union(v.literal("yellow"), v.literal("blue"), v.literal("green"), v.literal("pink")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
