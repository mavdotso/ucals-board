"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RichEditor } from "./editor/RichEditor";
import { useRouter } from "next/navigation";

export function DocPreview({ docId, onClose }: { docId: Id<"docs">; onClose: () => void }) {
  const doc = useQuery(api.docs.get, { id: docId });
  const router = useRouter();

  if (!doc) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-card-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        width: "100%", maxWidth: "760px", height: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>{doc.title}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{doc.path}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => { onClose(); router.push(`/docs?id=${docId}`); }}
              style={{
                background: "none", border: "1px solid var(--border-default)",
                borderRadius: "7px", padding: "5px 12px",
                color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer",
              }}
            >
              ↗ Open full
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <RichEditor content={doc.content} readonly />
        </div>
      </div>
    </div>
  );
}
