"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/app/components/Nav";

type StageStatus = "idle" | "running" | "complete" | "failed";
type PipelineStatus = "running" | "complete" | "failed";

type Stage = {
  stage: number;
  name: string;
  agent: string;
  status: StageStatus;
  docPath?: string;
  startedAt?: number;
  completedAt?: number;
};

type Pipeline = {
  _id: Id<"pipelines">;
  name: string;
  status: PipelineStatus;
  inputUrl: string;
  competitorName?: string;
  stages: Stage[];
  createdAt: number;
  updatedAt: number;
};

const STAGE_META = [
  { emoji: "🔍", label: "Competitor Research", agent: "Rex Ads", desc: "Analyze Meta Ads Library for competitor creatives and messaging" },
  { emoji: "🧠", label: "Campaign Strategy", agent: "Aria", desc: "Build campaign brief, targeting, positioning from research" },
  { emoji: "✍️", label: "Creative Production", agent: "Maya + Nova", desc: "Write copy and generate ad creative assets" },
  { emoji: "🚀", label: "Meta Publishing", agent: "Leo Meta", desc: "Push campaign to Meta Ads Manager as draft" },
];

const STATUS_COLOR: Record<StageStatus | PipelineStatus, string> = {
  idle: "var(--text-muted)",
  running: "#D8973C",
  complete: "#5C8A6C",
  failed: "#A4243B",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  idle: "Waiting",
  running: "Running",
  complete: "Done",
  failed: "Failed",
};

function StatusDot({ status }: { status: StageStatus }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8,
      borderRadius: "50%",
      background: STATUS_COLOR[status],
      boxShadow: status === "running" ? `0 0 0 3px ${STATUS_COLOR.running}33` : "none",
      animation: status === "running" ? "pulse 1.5s ease-in-out infinite" : "none",
    }} />
  );
}

function formatDuration(start?: number, end?: number) {
  if (!start) return "";
  const ms = (end ?? Date.now()) - start;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default function PipelinePage() {
  const pipelines = (useQuery(api.pipelines.list) ?? []) as Pipeline[];
  const createPipeline = useMutation(api.pipelines.create);
  const updateStage = useMutation(api.pipelines.updateStage);
  const removePipeline = useMutation(api.pipelines.remove);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState<Id<"pipelines"> | null>(null);
  const [activeId, setActiveId] = useState<Id<"pipelines"> | null>(null);

  const activePipeline = activeId ? pipelines.find(p => p._id === activeId) : pipelines[0] ?? null;

  async function handleCreate() {
    if (!newName.trim() || !newUrl.trim()) return;
    setCreating(true);
    const id = await createPipeline({ name: newName.trim(), inputUrl: newUrl.trim() });
    setNewName(""); setNewUrl("");
    setActiveId(id as Id<"pipelines">);
    setCreating(false);
  }

  async function runStage(pipeline: Pipeline, stageNum: number) {
    if (stageNum === 4) { setConfirmPublish(pipeline._id); return; }
    await updateStage({ id: pipeline._id, stage: stageNum, status: "running" });
    // Simulate completion after 2s (in real use, agents update this)
    setTimeout(async () => {
      await updateStage({ id: pipeline._id, stage: stageNum, status: "complete", docPath: `${["research", "campaign", "copy", "ads"][stageNum - 1]}/${new Date().toISOString().slice(0, 10)}-${pipeline.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-stage${stageNum}.md` });
    }, 2000);
  }

  async function confirmPublishStage(pipeline: Pipeline) {
    setConfirmPublish(null);
    await updateStage({ id: pipeline._id, stage: 4, status: "running" });
    setTimeout(async () => {
      await updateStage({ id: pipeline._id, stage: 4, status: "complete" });
    }, 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Nav active="/pipeline" right={<>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Pipeline name…"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "160px" }} />
        <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Meta Ads Library URL…"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "5px 10px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "200px" }} />
        <button onClick={handleCreate} disabled={!newName.trim() || !newUrl.trim() || creating}
          style={{ background: "var(--text-primary)", border: "none", borderRadius: "6px", padding: "5px 14px", color: "var(--bg-app)", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: newName.trim() && newUrl.trim() ? 1 : 0.4 }}>
          + New Run
        </button>
      </>} />

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

        {/* Active pipeline */}
        {activePipeline ? (
          <div style={{ marginBottom: "48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{activePipeline.name}</h2>
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: `${STATUS_COLOR[activePipeline.status]}18`, color: STATUS_COLOR[activePipeline.status], fontWeight: 600, textTransform: "capitalize" }}>{activePipeline.status}</span>
              <a href={activePipeline.inputUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>View source ↗</a>
            </div>

            {/* Stage cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
              {STAGE_META.map((meta, i) => {
                const stageNum = i + 1;
                const stage = activePipeline.stages.find(s => s.stage === stageNum);
                const status = stage?.status ?? "idle";
                const prevComplete = stageNum === 1 || activePipeline.stages.find(s => s.stage === stageNum - 1)?.status === "complete";
                const canRun = prevComplete && status === "idle";
                const isBlocked = !prevComplete && status === "idle";

                return (
                  <div key={stageNum} style={{ display: "flex", alignItems: "stretch" }}>
                    <div style={{
                      flex: 1,
                      padding: "24px 20px",
                      background: isBlocked ? "var(--bg-card)" : "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRight: stageNum < 4 ? "none" : "1px solid var(--border-subtle)",
                      borderRadius: stageNum === 1 ? "10px 0 0 10px" : stageNum === 4 ? "0 10px 10px 0" : "0",
                      opacity: isBlocked ? 0.5 : 1,
                      transition: "opacity 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "20px" }}>{meta.emoji}</span>
                        <StatusDot status={status} />
                        <span style={{ fontSize: "10px", color: STATUS_COLOR[status], fontWeight: 600, textTransform: "uppercase" }}>{STATUS_LABEL[status]}</span>
                        {(stage?.startedAt) && <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>{formatDuration(stage.startedAt, stage.completedAt)}</span>}
                      </div>

                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Stage {stageNum}</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>{meta.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>{meta.desc}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>Agent: <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{meta.agent}</span></div>

                      {stage?.docPath && (
                        <div style={{ fontSize: "11px", color: "#5C8A6C", marginBottom: "12px", wordBreak: "break-all" }}>
                          📄 {stage.docPath}
                        </div>
                      )}

                      {canRun && (
                        <button onClick={() => runStage(activePipeline, stageNum)} style={{ width: "100%", background: "var(--text-primary)", border: "none", borderRadius: "7px", padding: "8px 12px", color: "var(--bg-app)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                          {stageNum === 4 ? "Publish to Meta →" : "Run →"}
                        </button>
                      )}
                      {status === "running" && (
                        <div style={{ fontSize: "11px", color: STATUS_COLOR.running, textAlign: "center", marginTop: "4px" }}>Agent working…</div>
                      )}
                    </div>

                    {/* Arrow connector */}
                    {stageNum < 4 && (
                      <div style={{ display: "flex", alignItems: "center", padding: "0 2px", background: "var(--bg-app)", zIndex: 1 }}>
                        <span style={{ fontSize: "16px", color: status === "complete" ? STATUS_COLOR.complete : "var(--border-default)" }}>→</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</div>
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>No pipelines yet</div>
            <div style={{ fontSize: "12px" }}>Create a new run using the form above</div>
          </div>
        )}

        {/* Run history */}
        {pipelines.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Run history</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {pipelines.map(p => {
                const docsProduced = p.stages.filter(s => s.docPath).length;
                const isActive = p._id === (activePipeline?._id);
                return (
                  <div key={p._id} onClick={() => setActiveId(p._id)} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "12px 16px", borderRadius: "8px",
                    background: isActive ? "var(--bg-card-elevated)" : "var(--bg-card)",
                    border: `1px solid ${isActive ? "var(--border-default)" : "var(--border-subtle)"}`,
                    cursor: "pointer",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[p.status], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{docsProduced} doc{docsProduced !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    <button onClick={e => { e.stopPropagation(); if (confirm("Delete this pipeline run?")) removePipeline({ id: p._id }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", padding: "0 4px", opacity: 0.5 }}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm publish dialog */}
      {confirmPublish && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "12px", padding: "28px", maxWidth: "400px", width: "90%" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>Publish to Meta?</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px" }}>This will push all creative assets to Meta Ads Manager as a DRAFT campaign. You'll need to review and activate it manually in Meta.</div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmPublish(null)} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "7px", padding: "8px 16px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { const p = pipelines.find(x => x._id === confirmPublish); if (p) confirmPublishStage(p); }} style={{ background: "#A4243B", border: "none", borderRadius: "7px", padding: "8px 16px", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Publish Draft</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
