import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const AGENT_SKILLS: Record<string, string> = {
  aria: `${os.homedir()}/projects/ucals/agents/aria`,
  maya: `${os.homedir()}/projects/ucals/agents/maya`,
  leo: `${os.homedir()}/projects/ucals/agents/leo`,
  sage: `${os.homedir()}/projects/ucals/agents/sage`,
  rex: `${os.homedir()}/projects/ucals/agents/rex`,
};

export async function POST(req: NextRequest) {
  const { cardId, assignee, title, description, board } = await req.json();
  if (!assignee || !AGENT_SKILLS[assignee]) {
    return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
  }

  const skillDir = AGENT_SKILLS[assignee];
  const docsDir = `${os.homedir()}/projects/ucals/docs/${assignee}`;
  mkdirSync(docsDir, { recursive: true });

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const filename = `${new Date().toISOString().slice(0, 10)}-${slug}.md`;
  const docPath = `${assignee}/${filename}`;
  const fullPath = `${docsDir}/${filename}`;

  const prompt = `You are the UCals ${assignee} agent. Your skill file is at ${skillDir}/SKILL.md — read it first.

Task: ${title}
${description ? `\nContext: ${description}` : ""}

Write your deliverable as a markdown document and save it to: ${fullPath}

After saving, output exactly this line so the board can register the file:
DOC_SAVED:${docPath}`;

  // Fire and forget — agent runs in background
  const claudeCmd = `/opt/homebrew/bin/claude --dangerously-skip-permissions -p ${JSON.stringify(prompt)}`;

  exec(claudeCmd, { cwd: skillDir }, (err, stdout) => {
    if (err) console.error(`Agent ${assignee} error:`, err.message);
    // Post result back to board API
    if (stdout.includes("DOC_SAVED:")) {
      console.log(`Agent ${assignee} completed: ${docPath}`);
    }
  });

  return NextResponse.json({ started: true, docPath, assignee });
}
