import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { cardId, assignee, title, description, board } = await req.json();

    if (!assignee || assignee === "vlad") {
      return NextResponse.json({ error: "No agent assignee" }, { status: 400 });
    }

    // Enqueue job in Convex — local runner polls and picks it up
    const jobId = await convex.mutation(api.agentJobs.enqueue, {
      cardId, assignee, title, description, board,
    });

    // Post status note to card
    await convex.mutation(api.cards.addAgentNote, {
      id: cardId,
      agent: assignee,
      content: `▶ Task queued. Waiting for runner…`,
    });

    return NextResponse.json({ queued: true, jobId });

  } catch (err: any) {
    console.error("run-agent error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to queue job" }, { status: 500 });
  }
}
