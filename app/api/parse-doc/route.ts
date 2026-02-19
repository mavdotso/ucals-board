import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
    }

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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ucals-board.vercel.app",
        "X-Title": "UCals Board",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
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
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenRouter error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract JSON from response", raw: cleaned.slice(0, 200) }, { status: 500 });
    }

    const cards = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ cards });

  } catch (err: any) {
    console.error("parse-doc error:", err);
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
