import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);

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

Return ONLY a JSON array, no other text.

Document:
${text}`,
    }],
  });

  const raw = (response.content[0] as any).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 });

  return NextResponse.json({ cards: JSON.parse(jsonMatch[0]) });
}
