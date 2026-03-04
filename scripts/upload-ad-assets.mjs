#!/usr/bin/env node
/**
 * Upload all ad creative PNGs to Convex file storage.
 * Stores filename → storageId mapping in adAssets table.
 *
 * Usage: node scripts/upload-ad-assets.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";
import { homedir } from "os";

const CONVEX_URL = "https://small-platypus-541.convex.cloud";
const CREATIVES_DIRS = [
  join(homedir(), "openclaw/projects/ucals/docs/ads/creatives"),
  join(homedir(), "openclaw/projects/ucals/docs/ads/creatives/batch1"),
  join(homedir(), "openclaw/projects/ucals/docs/ads/creatives/batch_20260302"),
  join(homedir(), "openclaw/projects/ucals/docs/ads/creatives/batch1-fifty-cents"),
];

const client = new ConvexHttpClient(CONVEX_URL);

async function getPngFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".png")
      .map((e) => ({ filename: e.name, path: join(dir, e.name) }));
  } catch {
    return [];
  }
}

async function uploadFile(filePath, filename) {
  // 1. Get upload URL
  const uploadUrl = await client.mutation(api.adAssets.generateUploadUrl);

  // 2. Upload the file
  const data = await readFile(filePath);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${filename}: ${response.statusText}`);
  }

  const { storageId } = await response.json();

  // 3. Save mapping
  await client.mutation(api.adAssets.saveAsset, { filename, storageId });
  return storageId;
}

async function main() {
  // Collect all PNGs, deduplicate by filename (root takes priority over subdirs)
  const seen = new Map();
  for (const dir of CREATIVES_DIRS) {
    const files = await getPngFiles(dir);
    for (const f of files) {
      if (!seen.has(f.filename)) {
        seen.set(f.filename, f.path);
      }
    }
  }

  const files = [...seen.entries()].map(([filename, path]) => ({ filename, path }));
  console.log(`Found ${files.length} unique PNGs to upload.`);

  let uploaded = 0;
  let failed = 0;

  for (const { filename, path } of files) {
    try {
      const storageId = await uploadFile(path, filename);
      uploaded++;
      console.log(`[${uploaded}/${files.length}] ✓ ${filename} → ${storageId}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${filename}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${uploaded} uploaded, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
