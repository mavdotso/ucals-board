"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useCampaign } from "./CampaignContext";

const PAGES = [
  { href: "/", label: "ucals", bold: true },
  { href: "/docs", label: "docs" },
  { href: "/accounts", label: "accounts" },
  { href: "/calendar", label: "calendar" },
  { href: "/pipeline", label: "pipeline" },
  { href: "/board", label: "board" },
];

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };
  return { theme, toggle };
}

function CampaignSelector() {
  const { campaigns, activeCampaignId, activeCampaign, setActiveCampaignId, addCampaign } = useCampaign();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const visibleCampaigns = campaigns.filter(c => !c.archived);

  async function handleAdd() {
    if (!newName.trim()) return;
    const id = await addCampaign(newName);
    setActiveCampaignId(id);
    setNewName("");
    setAdding(false);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
        background: activeCampaign ? `${activeCampaign.color}18` : "transparent",
        border: activeCampaign ? `1px solid ${activeCampaign.color}44` : "1px solid var(--border-subtle)",
        color: activeCampaign ? activeCampaign.color : "var(--text-muted)",
        fontWeight: activeCampaign ? 600 : 400,
        minWidth: 90,
      }}>
        {activeCampaign && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeCampaign.color, flexShrink: 0 }} />
        )}
        {activeCampaign ? activeCampaign.name : "Campaign"}
        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          background: "var(--bg-card)", border: "1px solid var(--border-default)",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          minWidth: 200, zIndex: 50, overflow: "hidden",
        }}>
          {/* All (clear filter) */}
          <button onClick={() => { setActiveCampaignId(null); setOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 14px", background: !activeCampaignId ? "var(--bg-card-elevated)" : "transparent",
            border: "none", cursor: "pointer", fontSize: 12,
            color: "var(--text-primary)", textAlign: "left",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />
            All (no filter)
          </button>

          {visibleCampaigns.length > 0 && (
            <div style={{ height: 1, background: "var(--border-subtle)" }} />
          )}

          {/* Campaign list */}
          {visibleCampaigns.map(c => (
            <button key={c._id} onClick={() => { setActiveCampaignId(c._id); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 14px", background: activeCampaignId === c._id ? "var(--bg-card-elevated)" : "transparent",
              border: "none", cursor: "pointer", fontSize: 12,
              color: "var(--text-primary)", textAlign: "left",
              fontWeight: activeCampaignId === c._id ? 600 : 400,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              {c.name}
              {activeCampaignId === c._id && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
            </button>
          ))}

          <div style={{ height: 1, background: "var(--border-subtle)" }} />

          {/* Add new */}
          {adding ? (
            <div style={{ padding: "8px 10px", display: "flex", gap: 6 }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                placeholder="Campaign name…"
                style={{
                  flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                  borderRadius: 5, padding: "5px 8px", color: "var(--text-primary)", fontSize: 12, outline: "none",
                }}
              />
              <button onClick={handleAdd} disabled={!newName.trim()} style={{
                background: "var(--text-primary)", border: "none", borderRadius: 5,
                padding: "5px 10px", color: "var(--bg-app)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                opacity: newName.trim() ? 1 : 0.4,
              }}>Add</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              padding: "8px 14px", background: "transparent",
              border: "none", cursor: "pointer", fontSize: 12,
              color: "var(--text-muted)", textAlign: "left",
            }}>
              + New campaign
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Nav({ active, right }: { active: string; right?: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      padding: "0 24px",
      height: "52px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "var(--bg-secondary)",
      flexShrink: 0,
      gap: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {PAGES.map((page, i) => {
          const isActive = active === page.href;
          return (
            <span key={page.href} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {i > 0 && <span style={{ color: "var(--border-default)", fontSize: "13px" }}>/</span>}
              {isActive ? (
                <span style={{ fontSize: page.bold ? "15px" : "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {page.label}
                </span>
              ) : (
                <Link href={page.href} style={{
                  fontSize: page.bold ? "15px" : "13px",
                  fontWeight: page.bold ? 600 : 400,
                  color: page.bold ? "var(--text-primary)" : "var(--text-muted)",
                  textDecoration: "none",
                }}>
                  {page.label}
                </Link>
              )}
            </span>
          );
        })}
        <span style={{ color: "var(--border-default)", fontSize: "13px" }}>|</span>
        <CampaignSelector />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {right}
        <button onClick={toggle} title="Toggle light/dark mode" style={{
          background: "none", border: "1px solid var(--border-subtle)", borderRadius: "6px",
          padding: "4px 8px", cursor: "pointer", fontSize: "14px", lineHeight: 1,
          color: "var(--text-muted)",
        }}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
