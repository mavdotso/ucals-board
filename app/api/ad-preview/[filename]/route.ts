import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

// Root creatives dir — search here and legacy batch1/ subdir
const CREATIVES_DIR = join(
  process.env.HOME || "/Users/maver1ck",
  "openclaw/projects/ucals/docs/ads/creatives"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize — no path traversal, png only
  const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "");
  if (!safe || !safe.endsWith(".png")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Search in creatives root, then legacy batch1 subdir
  const candidates = [
    join(CREATIVES_DIR, safe),
    join(CREATIVES_DIR, "batch1", safe),
    join(CREATIVES_DIR, "batch_20260302", safe),
  ];

  for (const candidate of candidates) {
    // Extra safety: ensure resolved path stays within CREATIVES_DIR
    if (!resolve(candidate).startsWith(resolve(CREATIVES_DIR))) continue;
    try {
      const data = await readFile(candidate);
      return new NextResponse(data, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // Try next candidate
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
