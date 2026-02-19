import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardId, assignee, title, description, board } = body;

    if (!assignee || assignee === "vlad") {
      return NextResponse.json({ error: "No agent assignee" }, { status: 400 });
    }

    const runnerUrl = process.env.AGENT_RUNNER_URL;
    if (!runnerUrl) {
      return NextResponse.json({ error: "AGENT_RUNNER_URL not configured" }, { status: 500 });
    }

    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".convex.cloud", ".convex.site") ?? "";

    const res = await fetch(`${runnerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, assignee, title, description, board, convexSiteUrl }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Runner error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err: any) {
    console.error("run-agent error:", err);
    return NextResponse.json({ error: err?.message ?? "Could not reach agent runner" }, { status: 500 });
  }
}
