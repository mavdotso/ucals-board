"use client";
import { useState, useRef, useEffect } from "react";
import { useCampaign, Campaign } from "./CampaignContext";
import { useCampaignTags } from "./useCampaignTags";

// Small inline badge showing campaign tags on an item
// Click to open dropdown to add/remove campaigns
export function CampaignTag({ itemId }: { itemId: string }) {
  const { campaigns } = useCampaign();
  const { getItemCampaigns, toggleTag } = useCampaignTags();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const itemCampaigns = getItemCampaigns(itemId);
  const activeCampaigns = campaigns.filter(c => !c.archived && itemCampaigns.includes(c.id));
  const visibleCampaigns = campaigns.filter(c => !c.archived);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* Badges */}
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ display: "flex", gap: 3, alignItems: "center", cursor: "pointer" }}
      >
        {activeCampaigns.length > 0 ? (
          activeCampaigns.map(c => (
            <span key={c.id} style={{
              fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
              background: `${c.color}20`, color: c.color, whiteSpace: "nowrap",
            }}>{c.name}</span>
          ))
        ) : (
          <span style={{
            fontSize: 9, padding: "1px 6px", borderRadius: 4,
            background: "var(--bg-secondary)", color: "var(--text-muted)",
            border: "1px dashed var(--border-subtle)",
          }}>+ tag</span>
        )}
      </div>

      {/* Dropdown */}
      {open && visibleCampaigns.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "var(--bg-card)", border: "1px solid var(--border-default)",
            borderRadius: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            minWidth: 150, zIndex: 60, overflow: "hidden",
          }}
        >
          {visibleCampaigns.map(c => {
            const isTagged = itemCampaigns.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleTag(itemId, c.id)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "6px 12px", background: isTagged ? `${c.color}10` : "transparent",
                border: "none", cursor: "pointer", fontSize: 11,
                color: "var(--text-primary)", textAlign: "left",
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 10,
                  background: isTagged ? c.color : "var(--bg-secondary)",
                  border: isTagged ? "none" : "1px solid var(--border-subtle)",
                  color: "#fff",
                }}>{isTagged ? "✓" : ""}</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
