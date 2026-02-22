"use client";
import Link from "next/link";

const PAGES = [
  { href: "/", label: "ucals", bold: true },
  { href: "/docs", label: "docs" },
  { href: "/stack", label: "stack" },
  { href: "/calendar", label: "calendar" },
  { href: "/board", label: "board" },
];

export function Nav({ active, right }: { active: string; right?: React.ReactNode }) {
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
                <span style={{
                  fontSize: page.bold ? "15px" : "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}>
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
      {right && <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>{right}</div>}
    </header>
  );
}
