import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://small-platypus-541.convex.cloud"
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

  try {
    const url = await convex.query(api.adAssets.getUrl, { filename: safe });
    if (!url) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    // Redirect to Convex CDN URL — browser caches the image directly
    return NextResponse.redirect(url, { status: 302 });
  } catch (err) {
    console.error("ad-preview error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
