"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { marked } from "marked";
import { useRouter } from "next/navigation";

const MD_STYLES = `
  .doc-sheet-md { color: var(--text-secondary); font-size: 15px; line-height: 1.8; }
  .doc-sheet-md h1 { font-size: 1.5em; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); }
  .doc-sheet-md h2 { font-size: 1.25em; font-weight: 600; margin: 32px 0 10px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
  .doc-sheet-md h3 { font-size: 1.05em; font-weight: 600; margin: 24px 0 8px; color: var(--text-primary); }
  .doc-sheet-md p { margin: 0 0 14px; }
  .doc-sheet-md ul, .doc-sheet-md ol { margin: 0 0 14px; padding-left: 22px; }
  .doc-sheet-md li { margin-bottom: 5px; }
  .doc-sheet-md code { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 5px; font-size: 13px; font-family: monospace; color: var(--text-primary); }
  .doc-sheet-md pre { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0 0 16px; }
  .doc-sheet-md pre code { background: none; border: none; padding: 0; font-size: 13px; }
  .doc-sheet-md blockquote { border-left: 3px solid var(--border-default); margin: 0 0 14px; padding: 4px 16px; color: var(--text-muted); }
  .doc-sheet-md table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 13px; }
  .doc-sheet-md th { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 8px 12px; text-align: left; font-weight: 600; color: var(--text-primary); }
  .doc-sheet-md td { border: 1px solid var(--border-subtle); padding: 8px 12px; }
  .doc-sheet-md a { color: var(--text-primary); text-decoration: underline; }
  .doc-sheet-md strong { color: var(--text-primary); font-weight: 600; }
  .doc-sheet-md hr { border: none; border-top: 1px solid var(--border-subtle); margin: 24px 0; }
`;

interface DocSheetProps {
  docId: Id<"docs">;
  onClose: () => void;
}

export function DocSheet({ docId, onClose }: DocSheetProps) {
  const doc = useQuery(api.docs.get, { id: docId });
  const router = useRouter();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.4)",
          transition: "opacity 0.2s",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61,
        width: "min(640px, 85vw)",
        background: "var(--bg-card-elevated)",
        borderLeft: "1px solid var(--border-default)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.15s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {doc ? (
              <>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.path}
                </div>
              </>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
            {doc && (
              <button
                onClick={() => {
                  onClose();
                  const folder = doc.path.split("/").slice(0, -1).join("/");
                  const params = new URLSearchParams();
                  if (folder) params.set("folder", folder);
                  params.set("doc", doc._id);
                  router.push(`/docs?${params.toString()}`);
                }}
                style={{
                  background: "none", border: "1px solid var(--border-default)",
                  borderRadius: "7px", padding: "5px 12px",
                  color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer",
                }}
              >
                Open full ↗
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "0 4px" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {doc ? (
            <div
              className="doc-sheet-md"
              dangerouslySetInnerHTML={{ __html: marked.parse(doc.content, { async: false }) as string }}
            />
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading document…</div>
          )}
        </div>
      </div>

      <style>{MD_STYLES}{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
