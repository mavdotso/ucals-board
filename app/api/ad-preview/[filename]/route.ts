import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const ADS_DIR = join(
  process.env.HOME || "/Users/maver1ck",
  "openclaw/projects/ucals/docs/ads/creatives/batch1"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize — no path traversal
  const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "");
  if (!safe.endsWith(".png")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readFile(join(ADS_DIR, safe));
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
