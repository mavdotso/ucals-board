import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a short-lived upload URL for direct client upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save a storageId for a given filename after upload
export const saveAsset = mutation({
  args: {
    filename: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert — replace if filename already exists
    const existing = await ctx.db
      .query("adAssets")
      .withIndex("by_filename", (q) => q.eq("filename", args.filename))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        uploadedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("adAssets", {
        filename: args.filename,
        storageId: args.storageId,
        uploadedAt: Date.now(),
      });
    }
  },
});

// Resolve filename → public storage URL
export const getUrl = query({
  args: { filename: v.string() },
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("adAssets")
      .withIndex("by_filename", (q) => q.eq("filename", args.filename))
      .unique();
    if (!asset) return null;
    return await ctx.storage.getUrl(asset.storageId as any);
  },
});

// List all uploaded assets (for verification)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adAssets").collect();
  },
});
