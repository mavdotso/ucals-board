import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Strip HTML, collapse whitespace, truncate
    const text = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    if (!text || text.length < 10) {
      return NextResponse.json({ error: "Document appears empty after parsing" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are Aria, UCals marketing manager. Parse this document and extract all actionable tasks.

For each task, output JSON with these exact fields:
- title: short action-oriented title (max 60 chars)
- description: what needs to be done (1-3 sentences)
- priority: "high" | "medium" | "low"
- assignee: "maya" (copy/landing page/email) | "leo" (social media/Twitter/LinkedIn) | "sage" (SEO/GEO/keywords) | "rex" (paid ads/Meta/Google Ads)
- category: always "Marketing"

Return ONLY a valid JSON array, no other text, no markdown code fences.

Document:
${text}`,
      }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract JSON from response", raw: cleaned.slice(0, 200) }, { status: 500 });
    }

    const cards = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ cards });

  } catch (err: any) {
    console.error("parse-doc error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
