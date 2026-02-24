"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const PAGES = [
  { href: "/", label: "ucals", bold: true },
  { href: "/docs", label: "docs" },
  { href: "/stack", label: "stack" },
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
