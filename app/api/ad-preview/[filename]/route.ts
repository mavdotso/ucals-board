import { NextRequest, NextResponse } from "next/server";

// Cloudflare R2 public bucket URL
const R2_BASE_URL =
  process.env.R2_PUBLIC_URL ?? "https://pub-5c8616b103b74818bcc26741b647830a.r2.dev";

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

  // Redirect to R2 CDN — fast, cached at edge
  return NextResponse.redirect(`${R2_BASE_URL}/${safe}`, { status: 302 });
}
