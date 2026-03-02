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

// Editable text field
function EditableField({ label, value, onChange, multiline = false, mono = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  mono?: boolean;
}) {
  const base: React.CSSProperties = {
    width: "100%", background: "var(--bg-card, #1a1918)",
    border: "1px solid var(--border-subtle, #2a2927)", borderRadius: 6,
    color: "var(--text-primary, #f5f4f2)", fontSize: 13, lineHeight: 1.5,
    padding: "6px 10px", resize: "vertical", outline: "none",
    fontFamily: mono ? "monospace" : "inherit",
  };
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "var(--text-muted, #6b6a68)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
      }}>{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={base}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...base, resize: undefined }}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "var(--text-muted, #6b6a68)",
      textTransform: "uppercase", letterSpacing: "0.08em",
      paddingBottom: 8, borderBottom: "1px solid var(--border-subtle, #2a2927)",
      marginBottom: 4,
    }}>{children}</div>
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
  const [acting, setActing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields state — initialised from card
  const [fields, setFields] = useState<Record<string, string>>({ ...card.fields });

  const set = (key: string) => (val: string) => setFields(f => ({ ...f, [key]: val }));

  const imgUrl = fields.previewImage || (fields.imgFile ? `/api/ad-preview/${encodeURIComponent(fields.imgFile)}` : null);

  async function handleSave() {
    setActing(true);
    const { previewImage, ...rest } = fields; // don't resave base64 unless changed
    await updateCard({ id: card._id, fields: { ...fields } });
    setSaved(true);
    setActing(false);
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
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(900px, 95vw)",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #f5f4f2)" }}>
              {card.title}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {fields.platform && <Badge label={fields.platform} color="#3B82F6" />}
              {fields.audience && <Badge label={fields.audience} color="#A855F7" />}
              {fields.colour && <Badge label={fields.colour} color={fields.colour === "teal" ? "#14B8A6" : "#D4A574"} />}
              {fields.format && <Badge label={fields.format} color="#6B8A9C" />}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 4px",
          }}>×</button>
        </div>

        {/* Body — 3 columns: image | brief | copy */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", gap: 20 }}>

          {/* LEFT — Image */}
          <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 12 }}>
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
          </div>

          {/* MIDDLE — Brief context (read-only overview + editable) */}
          <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabel>Brief / Origin</SectionLabel>

            <EditableField label="ICP (Target Audience)" value={fields.icp || ""} onChange={set("icp")} />
            <EditableField label="Angle" value={fields.angle || ""} onChange={set("angle")} multiline />
            <EditableField label="Competitor Intel" value={fields.competitorIntel || ""} onChange={set("competitorIntel")} multiline />
            <EditableField label="Platform" value={fields.platform || ""} onChange={set("platform")} />
            <EditableField label="Audience" value={fields.audience || ""} onChange={set("audience")} />
            <EditableField label="Format" value={fields.format || ""} onChange={set("format")} />
            <EditableField label="Landing Page URL" value={fields.landingPage || ""} onChange={set("landingPage")} />
          </div>

          {/* RIGHT — Copy (all editable) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabel>Ad Copy</SectionLabel>

            <EditableField label="Hook (visual headline — on image)" value={fields.hook || ""} onChange={set("hook")} />
            <EditableField label="Subline (on image, below hook)" value={fields.subline || ""} onChange={set("subline")} />

            <div style={{ height: 1, background: "var(--border-subtle, #2a2927)" }} />

            <EditableField label="Meta Primary Text (ad body)" value={fields.primaryText || ""} onChange={set("primaryText")} multiline />
            <EditableField label="Meta Headline (link title)" value={fields.headline || ""} onChange={set("headline")} />
            <EditableField label="Meta Description (link subtitle)" value={fields.description || ""} onChange={set("description")} />
            <EditableField label="CTA Button" value={fields.cta || ""} onChange={set("cta")} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleReject}
              disabled={acting}
              style={{
                background: "none", border: "1px solid #555",
                borderRadius: 8, padding: "8px 18px",
                color: "#999", fontSize: 13, fontWeight: 600,
                cursor: acting ? "default" : "pointer", opacity: acting ? 0.5 : 1,
              }}
            >
              ✕ Reject
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && <span style={{ fontSize: 12, color: "#5C8A6C" }}>Saved ✓</span>}
            <button
              onClick={handleSave}
              disabled={acting}
              style={{
                background: "none", border: "1px solid var(--border-default, #3a3835)",
                borderRadius: 8, padding: "8px 18px",
                color: "var(--text-primary, #f5f4f2)", fontSize: 13, fontWeight: 600,
                cursor: acting ? "default" : "pointer", opacity: acting ? 0.5 : 1,
              }}
            >
              Save edits
            </button>
            <button
              onClick={handleApprove}
              disabled={acting}
              style={{
                background: "#5C8A6C", border: "none",
                borderRadius: 8, padding: "8px 24px",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: acting ? "default" : "pointer", opacity: acting ? 0.5 : 1,
              }}
            >
              ✓ Approve → Live
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes adSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        textarea:focus, input[type=text]:focus {
          border-color: #BD632F !important;
        }
      `}</style>
    </>
  );
}
