"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef } from "react";

interface AdReviewPanelProps {
  card: {
    _id: Id<"pipelineCards">;
    title: string;
    fields: Record<string, string>;
  };
  onClose: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ReadField({ label, value, accent, mono }: {
  label: string; value?: string; accent?: boolean; mono?: boolean;
}) {
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
        fontFamily: mono ? "monospace" : "inherit",
      }}>{value}</div>
    </div>
  );
}

function EditField({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-secondary, #252321)",
    border: "1px solid var(--border-default, #3a3835)",
    borderRadius: 6,
    color: "var(--text-primary, #f5f4f2)",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "8px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: multiline ? "vertical" : "none",
    boxSizing: "border-box",
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

// ─── Platform Tab ─────────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: "meta",     label: "Meta",     color: "#3B82F6", icon: "f" },
  { key: "reddit",   label: "Reddit",   color: "#FF4500", icon: "r" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "in" },
];

const PLATFORM_FIELDS: Record<string, Array<{ key: string; label: string; multiline?: boolean }>> = {
  meta: [
    { key: "meta_primaryText", label: "Primary Text (ad body)", multiline: true },
    { key: "meta_headline",    label: "Headline (link title)" },
    { key: "meta_description", label: "Description (link subtitle)" },
  ],
  reddit: [
    { key: "reddit_title", label: "Post Title" },
    { key: "reddit_body",  label: "Post Body", multiline: true },
  ],
  linkedin: [
    { key: "linkedin_introText", label: "Intro Text (sponsored content)", multiline: true },
    { key: "linkedin_headline",  label: "Headline" },
  ],
};

// Size manifest display
const SIZE_LABELS: Record<string, { label: string; dims: string; platform: string }> = {
  meta_square:    { label: "Feed Square",    dims: "1080×1080", platform: "Meta" },
  meta_portrait:  { label: "Feed Portrait",  dims: "1080×1350", platform: "Meta" },
  meta_stories:   { label: "Stories/Reels",  dims: "1080×1920", platform: "Meta" },
  meta_landscape: { label: "Landscape",      dims: "1200×628",  platform: "Meta" },
  reddit_feed:    { label: "Feed",           dims: "1200×628",  platform: "Reddit" },
  reddit_square:  { label: "Square",         dims: "1080×1080", platform: "Reddit" },
  linkedin_single:{ label: "Single Image",   dims: "1200×628",  platform: "LinkedIn" },
  linkedin_square:{ label: "Square",         dims: "1080×1080", platform: "LinkedIn" },
};

const CREATIVES_BASE = "/api/ad-preview/";

function SizeRow({ sizeKey, file, previewImage, sizeImage }: {
  sizeKey: string; file: string; previewImage?: string; sizeImage?: string;
}) {
  const meta = SIZE_LABELS[sizeKey];
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Prefer base64 sizeImage stored in Convex (works on Vercel), fall back to local API route
  const imgSrc = sizeImage || `${CREATIVES_BASE}${encodeURIComponent(file)}`;

  // Popup dimensions based on aspect ratio
  const [w, h] = meta ? meta.dims.split("×").map(Number) : [1080, 1080];
  const maxW = 300;
  const popW = maxW;
  const popH = Math.round(maxW * (h / w));

  function onMouseMove(e: React.MouseEvent) {
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  // Position popup to the right of cursor, vertically centered
  // If near right edge of viewport, flip to left side
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const flipX = mousePos.x + popW + 24 > viewportW;
  const popLeft = flipX ? mousePos.x - popW - 16 : mousePos.x + 16;
  const popTop = Math.max(8, Math.min(mousePos.y - popH / 2, (typeof window !== "undefined" ? window.innerHeight : 900) - popH - 8));

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMouseMove}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 8px", borderRadius: 5, cursor: "pointer",
        background: hovered ? "var(--bg-card-elevated, #252321)" : "var(--bg-card, #1a1918)",
        border: `1px solid ${hovered ? "var(--border-default, #3a3835)" : "var(--border-subtle, #2a2927)"}`,
        transition: "background 0.1s, border-color 0.1s",
      }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary, #a5a4a0)" }}>{meta?.label}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{meta?.dims}</span>

      {/* Hover preview — follows cursor */}
      {hovered && (
        <div style={{
          position: "fixed",
          left: popLeft,
          top: popTop,
          width: popW,
          height: popH,
          zIndex: 9999,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          border: "1px solid var(--border-default, #3a3835)",
          pointerEvents: "none",
          background: "#1a1918",
        }}>
          <img
            src={imgSrc}
            alt={meta?.label}
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
            onError={(e) => {
              if (previewImage) (e.target as HTMLImageElement).src = previewImage;
            }}
          />
        </div>
      )}
    </div>
  );
}

function SizesGrid({ sizeFilesJson, sizeImagesJson, previewImage }: {
  sizeFilesJson?: string; sizeImagesJson?: string; previewImage?: string;
}) {
  if (!sizeFilesJson) return null;
  let files: Record<string, string> = {};
  let sizeImages: Record<string, string> = {};
  try { files = JSON.parse(sizeFilesJson); } catch { return null; }
  try { if (sizeImagesJson) sizeImages = JSON.parse(sizeImagesJson); } catch { /* ignore */ }

  const byPlatform: Record<string, Array<{ key: string; file: string }>> = {};
  for (const [key, file] of Object.entries(files)) {
    const meta = SIZE_LABELS[key];
    if (!meta) continue;
    if (!byPlatform[meta.platform]) byPlatform[meta.platform] = [];
    byPlatform[meta.platform].push({ key, file });
  }

  return (
    <div style={{ marginTop: 8 }} data-sizegrid="">
      {Object.entries(byPlatform).map(([platform, items]) => (
        <div key={platform} style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5,
          }}>{platform}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {items.map(({ key, file }) => (
              <SizeRow key={key} sizeKey={key} file={file} previewImage={previewImage} sizeImage={sizeImages[key]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdReviewPanel({ card, onClose }: AdReviewPanelProps) {
  const updateCard = useMutation(api.pipelineCards.update);
  const [activePlatform, setActivePlatform] = useState<string>("meta");
  const [editing, setEditing] = useState(false);
  const [acting, setActing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({ ...card.fields });
  const set = (key: string) => (val: string) => setFields(f => ({ ...f, [key]: val }));

  const imgUrl = fields.previewImage || (fields.imgFile
    ? `/api/ad-preview/${encodeURIComponent(fields.imgFile)}`
    : null);

  // Which platforms actually have copy
  const coveredPlatforms = PLATFORMS.filter(p =>
    PLATFORM_FIELDS[p.key].some(f => !!fields[f.key])
  );

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

  const activePlatformCfg = PLATFORMS.find(p => p.key === activePlatform)!;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)" }} />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(1080px, 98vw)",
        background: "var(--bg-card-elevated, #1e1d1b)",
        borderLeft: "1px solid var(--border-default, #3a3835)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column",
        animation: "adSlideIn 0.15s ease-out",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--border-subtle, #2a2927)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #f5f4f2)", whiteSpace: "nowrap" }}>{card.title}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {fields.icp      && <Badge label={fields.icp}      color="#BD632F" />}
              {fields.colour   && <Badge label={fields.colour}   color={fields.colour === "teal" ? "#14B8A6" : "#D4A574"} />}
              {fields.audience && <Badge label={fields.audience} color="#A855F7" />}
              {fields.sizeCount && (
                <Badge label={`${fields.sizeCount} sizes`} color="#5C8A6C" />
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", gap: 20, minHeight: 0 }}>

          {/* LEFT — Image + sizes */}
          <div style={{ flex: "0 0 240px", display: "flex", flexDirection: "column", gap: 12 }}>
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

            {/* Sizes manifest */}
            {fields.sizeFiles && (
              <div>
                <SectionLabel>Exported Sizes</SectionLabel>
                <SizesGrid sizeFilesJson={fields.sizeFiles} sizeImagesJson={fields.sizeImages} previewImage={fields.previewImage} />
              </div>
            )}

            {/* Landing page */}
            {fields.landingPage && !editing && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Landing Page</div>
                <a href={fields.landingPage} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#BD632F", wordBreak: "break-all" }}>
                  {fields.landingPage}
                </a>
              </div>
            )}
            {editing && (
              <EditField label="Landing Page URL" value={fields.landingPage || ""} onChange={set("landingPage")} />
            )}
          </div>

          {/* MIDDLE — Brief */}
          <div style={{ flex: "0 0 210px", display: "flex", flexDirection: "column" }}>
            <SectionLabel>Brief</SectionLabel>
            {editing ? (
              <>
                <EditField label="ICP (Target Audience)" value={fields.icp || ""}             onChange={set("icp")} />
                <EditField label="Angle"                 value={fields.angle || ""}           onChange={set("angle")} multiline />
                <EditField label="Competitor Intel"      value={fields.competitorIntel || ""} onChange={set("competitorIntel")} multiline />
                <EditField label="Audience"              value={fields.audience || ""}        onChange={set("audience")} />
              </>
            ) : (
              <>
                <ReadField label="ICP"             value={fields.icp}             accent />
                <ReadField label="Angle"           value={fields.angle} />
                <ReadField label="Competitor Intel" value={fields.competitorIntel} />
                <ReadField label="Audience"        value={fields.audience} />
              </>
            )}

            {/* Visual copy (shared across platforms) */}
            <div style={{ marginTop: 8 }}>
              <SectionLabel>Visual (on image)</SectionLabel>
              {editing ? (
                <>
                  <EditField label="Hook (headline)"  value={fields.hook || ""}    onChange={set("hook")} />
                  <EditField label="Subline"          value={fields.subline || ""} onChange={set("subline")} />
                  <EditField label="CTA Button"       value={fields.cta || ""}     onChange={set("cta")} />
                </>
              ) : (
                <>
                  <ReadField label="Hook"    value={fields.hook}    accent />
                  <ReadField label="Subline" value={fields.subline} />
                  {fields.cta && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>CTA Button</div>
                      <span style={{
                        display: "inline-block", padding: "5px 14px", borderRadius: 6,
                        background: "#BD632F", color: "#fff", fontSize: 13, fontWeight: 600,
                      }}>{fields.cta}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT — Platform copy tabs */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* Platform tab bar */}
            <div style={{
              display: "flex", gap: 4, marginBottom: 16, flexShrink: 0,
              borderBottom: "1px solid var(--border-subtle, #2a2927)", paddingBottom: 12,
            }}>
              {PLATFORMS.map(p => {
                const hasCopy = PLATFORM_FIELDS[p.key].some(f => !!fields[f.key]);
                const isActive = activePlatform === p.key;
                return (
                  <button key={p.key} onClick={() => setActivePlatform(p.key)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.1s",
                    background: isActive ? `${p.color}18` : "transparent",
                    border: isActive ? `1px solid ${p.color}40` : "1px solid transparent",
                    color: isActive ? p.color : "var(--text-muted)",
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 3, fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? p.color : "var(--bg-secondary)",
                      color: isActive ? "#fff" : "var(--text-muted)",
                      letterSpacing: "-0.03em",
                    }}>{p.icon}</span>
                    {p.label}
                    {!hasCopy && (
                      <span style={{ fontSize: 10, opacity: 0.5 }}>—</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active platform copy */}
            <div style={{ flex: 1 }}>
              <SectionLabel>{activePlatformCfg.label} Copy</SectionLabel>

              {editing ? (
                PLATFORM_FIELDS[activePlatform].map(f => (
                  <EditField
                    key={f.key}
                    label={f.label}
                    value={fields[f.key] || ""}
                    onChange={set(f.key)}
                    multiline={f.multiline}
                  />
                ))
              ) : (
                PLATFORM_FIELDS[activePlatform].some(f => !!fields[f.key]) ? (
                  PLATFORM_FIELDS[activePlatform].map(f => (
                    <ReadField key={f.key} label={f.label} value={fields[f.key]} />
                  ))
                ) : (
                  <div style={{
                    padding: "32px 16px", textAlign: "center",
                    color: "var(--text-muted)", fontSize: 13,
                    border: "1px dashed var(--border-subtle)", borderRadius: 8,
                  }}>
                    No {activePlatformCfg.label} copy yet.<br />
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Click ✏️ Edit to add it.</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
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
