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

export function AdReviewPanel({ card, onClose }: AdReviewPanelProps) {
  const updateCard = useMutation(api.pipelineCards.update);
  const [acting, setActing] = useState(false);
  const f = card.fields;

  const imgUrl = f.imgFile ? `/api/ad-preview/${encodeURIComponent(f.imgFile)}` : null;

  async function handleAccept() {
    setActing(true);
    await updateCard({ id: card._id, column: "Live" });
    onClose();
  }

  async function handleDiscard() {
    setActing(true);
    await updateCard({ id: card._id, column: "Research" });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.6)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(780px, 90vw)",
        background: "var(--bg-card-elevated, #1e1d1b)",
        borderLeft: "1px solid var(--border-default, #3a3835)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column",
        animation: "adSlideIn 0.15s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #f5f4f2)" }}>
            {card.title}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted, #a5a4a0)",
            cursor: "pointer", fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Content — image left, copy right */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", gap: 20 }}>
          {/* Image */}
          <div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", gap: 12 }}>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={card.title}
                style={{
                  width: "100%", borderRadius: 12,
                  border: "1px solid var(--border-subtle, #2a2927)",
                  background: "#000",
                }}
              />
            ) : (
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 12,
                background: "var(--bg-card, #1a1918)",
                border: "1px solid var(--border-subtle, #2a2927)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 13,
              }}>
                No preview
              </div>
            )}

            {/* Badges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {f.platform && <Badge label={f.platform} color="#3B82F6" />}
              {f.audience && <Badge label={f.audience} color="#A855F7" />}
              {f.colour && <Badge label={f.colour} color={f.colour === "teal" ? "#14B8A6" : "#D4A574"} />}
              {f.format && <Badge label={f.format} color="#6B8A9C" />}
            </div>
          </div>

          {/* Copy */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Hook */}
            {f.hook && (
              <div>
                <Label>Hook (Visual Headline)</Label>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary, #f5f4f2)", lineHeight: 1.3 }}>
                  {f.hook}
                </div>
              </div>
            )}

            {/* Subline */}
            {f.subline && (
              <div>
                <Label>Subline</Label>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#C2410C", lineHeight: 1.4 }}>
                  {f.subline}
                </div>
              </div>
            )}

            {/* Headline */}
            {f.headline && (
              <div>
                <Label>Meta Headline</Label>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #f5f4f2)", lineHeight: 1.4 }}>
                  {f.headline}
                </div>
              </div>
            )}

            {/* Primary Text */}
            {f.primaryText && (
              <div>
                <Label>Primary Text</Label>
                <div style={{
                  fontSize: 13, color: "var(--text-secondary, #a5a4a0)", lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {f.primaryText}
                </div>
              </div>
            )}

            {/* Description */}
            {f.description && (
              <div>
                <Label>Link Description</Label>
                <div style={{ fontSize: 13, color: "var(--text-secondary, #a5a4a0)", lineHeight: 1.5 }}>
                  {f.description}
                </div>
              </div>
            )}

            {/* CTA */}
            {f.cta && (
              <div>
                <Label>CTA</Label>
                <span style={{
                  display: "inline-block", padding: "6px 16px", borderRadius: 6,
                  background: "#3B82F6", color: "#fff", fontSize: 13, fontWeight: 600,
                }}>
                  {f.cta}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer — Accept / Discard */}
        <div style={{
          padding: "16px 20px", borderTop: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={handleDiscard}
            disabled={acting}
            style={{
              background: "none", border: "1px solid var(--cranberry, #A4243B)",
              borderRadius: 8, padding: "8px 20px",
              color: "var(--cranberry, #A4243B)", fontSize: 13, fontWeight: 600,
              cursor: acting ? "default" : "pointer", opacity: acting ? 0.5 : 1,
            }}
          >
            Discard → Research
          </button>
          <button
            onClick={handleAccept}
            disabled={acting}
            style={{
              background: "var(--forest, #5C8A6C)", border: "none",
              borderRadius: 8, padding: "8px 24px",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: acting ? "default" : "pointer", opacity: acting ? 0.5 : 1,
            }}
          >
            Accept → Live
          </button>
        </div>
      </div>

      <style>{`
        @keyframes adSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: "var(--text-muted, #6b6a68)",
      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
      background: `${color}20`, color, textTransform: "capitalize",
    }}>
      {label}
    </span>
  );
}
