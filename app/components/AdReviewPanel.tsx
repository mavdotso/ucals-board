"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface AdReviewPanelProps {
  card: {
    _id: Id<"pipelineCards">;
    title: string;
    fields: Record<string, string>;
  };
  onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "var(--text-muted, #6b6a68)",
      textTransform: "uppercase", letterSpacing: "0.08em",
      paddingBottom: 8, borderBottom: "1px solid var(--border-subtle, #2a2927)",
      marginBottom: 12,
    }}>{children}</div>
  );
}

function ReadField({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "var(--text-muted, #6b6a68)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 13, lineHeight: 1.5,
        color: accent ? "#BD632F" : "var(--text-primary, #f5f4f2)",
        whiteSpace: "pre-wrap",
      }}>{value}</div>
    </div>
  );
}

function EditField({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const base: React.CSSProperties = {
    width: "100%", background: "#141312",
    border: "1px solid var(--border-default, #3a3835)", borderRadius: 6,
    color: "var(--text-primary, #f5f4f2)", fontSize: 13, lineHeight: 1.5,
    padding: "6px 10px", outline: "none", fontFamily: "inherit",
    resize: multiline ? "vertical" : "none",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "var(--text-muted, #6b6a68)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
      }}>{label}</div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={base} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} style={base} />
      }
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
      background: `${color}20`, color, textTransform: "capitalize",
    }}>{label}</span>
  );
}

export function AdReviewPanel({ card, onClose }: AdReviewPanelProps) {
  const updateCard = useMutation(api.pipelineCards.update);
  const [editing, setEditing] = useState(false);
  const [acting, setActing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({ ...card.fields });
  const set = (key: string) => (val: string) => setFields(f => ({ ...f, [key]: val }));

  const imgUrl = fields.previewImage || (fields.imgFile ? `/api/ad-preview/${encodeURIComponent(fields.imgFile)}` : null);

  async function handleSave() {
    setActing(true);
    await updateCard({ id: card._id, fields });
    setSaved(true);
    setActing(false);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleApprove() {
    setActing(true);
    await updateCard({ id: card._id, column: "Live", fields });
    onClose();
  }

  async function handleReject() {
    setActing(true);
    await updateCard({ id: card._id, column: "Rejected", fields });
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)" }} />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(960px, 96vw)",
        background: "var(--bg-card-elevated, #1e1d1b)",
        borderLeft: "1px solid var(--border-default, #3a3835)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column",
        animation: "adSlideIn 0.15s ease-out",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #f5f4f2)" }}>{card.title}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {fields.icp && <Badge label={fields.icp} color="#BD632F" />}
              {fields.platform && <Badge label={fields.platform} color="#3B82F6" />}
              {fields.audience && <Badge label={fields.audience} color="#A855F7" />}
              {fields.colour && <Badge label={fields.colour} color={fields.colour === "teal" ? "#14B8A6" : "#D4A574"} />}
              {fields.format && <Badge label={fields.format} color="#6B8A9C" />}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{
                background: "none", border: "1px solid var(--border-default, #3a3835)",
                borderRadius: 6, padding: "5px 14px", color: "var(--text-secondary, #a5a4a0)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>✏️ Edit</button>
            )}
            {editing && (
              <>
                <button onClick={() => { setEditing(false); setFields({ ...card.fields }); }} style={{
                  background: "none", border: "1px solid var(--border-default, #3a3835)",
                  borderRadius: 6, padding: "5px 14px", color: "var(--text-muted, #6b6a68)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Cancel</button>
                <button onClick={handleSave} disabled={acting} style={{
                  background: "#BD632F", border: "none",
                  borderRadius: 6, padding: "5px 14px", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Save</button>
              </>
            )}
            {saved && <span style={{ fontSize: 12, color: "#5C8A6C" }}>Saved ✓</span>}
            <button onClick={onClose} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 4px",
            }}>×</button>
          </div>
        </div>

        {/* Body — image | brief | copy */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", gap: 20, minHeight: 0 }}>

          {/* LEFT — Image */}
          <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 10 }}>
            {imgUrl ? (
              <img src={imgUrl} alt={card.title} style={{
                width: "100%", borderRadius: 10,
                border: "1px solid var(--border-subtle, #2a2927)",
              }} />
            ) : (
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 10,
                background: "var(--bg-card, #1a1918)",
                border: "1px solid var(--border-subtle, #2a2927)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 13,
              }}>No preview</div>
            )}
            {fields.landingPage && !editing && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Landing Page</div>
                <a href={fields.landingPage} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#BD632F", wordBreak: "break-all" }}>{fields.landingPage}</a>
              </div>
            )}
            {editing && (
              <EditField label="Landing Page URL" value={fields.landingPage || ""} onChange={set("landingPage")} />
            )}
          </div>

          {/* MIDDLE — Brief / Origin */}
          <div style={{ flex: "0 0 210px", display: "flex", flexDirection: "column" }}>
            <SectionLabel>Brief / Origin</SectionLabel>
            {editing ? (
              <>
                <EditField label="ICP (Target Audience)" value={fields.icp || ""} onChange={set("icp")} />
                <EditField label="Angle" value={fields.angle || ""} onChange={set("angle")} multiline />
                <EditField label="Competitor Intel" value={fields.competitorIntel || ""} onChange={set("competitorIntel")} multiline />
                <EditField label="Platform" value={fields.platform || ""} onChange={set("platform")} />
                <EditField label="Audience" value={fields.audience || ""} onChange={set("audience")} />
                <EditField label="Format" value={fields.format || ""} onChange={set("format")} />
              </>
            ) : (
              <>
                <ReadField label="ICP" value={fields.icp} accent />
                <ReadField label="Angle" value={fields.angle} />
                <ReadField label="Competitor Intel" value={fields.competitorIntel} />
                <ReadField label="Platform" value={fields.platform} />
                <ReadField label="Audience" value={fields.audience} />
                <ReadField label="Format" value={fields.format} />
              </>
            )}
          </div>

          {/* RIGHT — Copy */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <SectionLabel>Ad Copy</SectionLabel>
            {editing ? (
              <>
                <EditField label="Hook (on image — visual headline)" value={fields.hook || ""} onChange={set("hook")} />
                <EditField label="Subline (on image — below hook)" value={fields.subline || ""} onChange={set("subline")} />
                <div style={{ height: 1, background: "var(--border-subtle, #2a2927)", margin: "4px 0 12px" }} />
                <EditField label="Meta Primary Text (ad body)" value={fields.primaryText || ""} onChange={set("primaryText")} multiline />
                <EditField label="Meta Headline (link title)" value={fields.headline || ""} onChange={set("headline")} />
                <EditField label="Meta Description (link subtitle)" value={fields.description || ""} onChange={set("description")} />
                <EditField label="CTA Button" value={fields.cta || ""} onChange={set("cta")} />
              </>
            ) : (
              <>
                <ReadField label="Hook (on image)" value={fields.hook} />
                <ReadField label="Subline (on image)" value={fields.subline} />
                <div style={{ height: 1, background: "var(--border-subtle, #2a2927)", margin: "4px 0 12px" }} />
                <ReadField label="Meta Primary Text" value={fields.primaryText} />
                <ReadField label="Meta Headline" value={fields.headline} />
                <ReadField label="Meta Description" value={fields.description} />
                {fields.cta && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>CTA Button</div>
                    <span style={{ display: "inline-block", padding: "5px 14px", borderRadius: 6, background: "#BD632F", color: "#fff", fontSize: 13, fontWeight: 600 }}>{fields.cta}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <button onClick={handleReject} disabled={acting} style={{
            background: "none", border: "1px solid #444", borderRadius: 8, padding: "8px 18px",
            color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: acting ? 0.5 : 1,
          }}>✕ Reject</button>

          <button onClick={handleApprove} disabled={acting} style={{
            background: "#5C8A6C", border: "none", borderRadius: 8, padding: "8px 28px",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: acting ? 0.5 : 1,
          }}>✓ Approve → Live</button>
        </div>
      </div>

      <style>{`
        @keyframes adSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        textarea:focus, input[type=text]:focus { border-color: #BD632F !important; }
      `}</style>
    </>
  );
}
