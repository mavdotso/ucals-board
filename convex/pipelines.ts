import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_STAGES = [
  { stage: 1, name: "Competitor Research", agent: "rex-ads", status: "idle" as const },
  { stage: 2, name: "Campaign Strategy", agent: "aria", status: "idle" as const },
  { stage: 3, name: "Creative Production", agent: "maya + nova", status: "idle" as const },
  { stage: 4, name: "Meta Publishing", agent: "leo-meta", status: "idle" as const },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pipelines").order("desc").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), inputUrl: v.string() },
  handler: async (ctx, { name, inputUrl }) => {
    return await ctx.db.insert("pipelines", {
      name,
      status: "running",
      inputUrl,
      stages: DEFAULT_STAGES,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateStage = mutation({
  args: {
    id: v.id("pipelines"),
    stage: v.number(),
    status: v.union(v.literal("idle"), v.literal("running"), v.literal("complete"), v.literal("failed")),
    docPath: v.optional(v.string()),
  },
  handler: async (ctx, { id, stage, status, docPath }) => {
    const pipeline = await ctx.db.get(id);
    if (!pipeline) return;
    const stages = pipeline.stages.map(s =>
      s.stage === stage
        ? { ...s, status, docPath, ...(status === "running" ? { startedAt: Date.now() } : {}), ...(status === "complete" || status === "failed" ? { completedAt: Date.now() } : {}) }
        : s
    );
    const allDone = stages.every(s => s.status === "complete");
    const anyFailed = stages.some(s => s.status === "failed");
    await ctx.db.patch(id, {
      stages,
      status: anyFailed ? "failed" : allDone ? "complete" : "running",
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("pipelines") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
