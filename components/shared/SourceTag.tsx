"use client";
export default function SourceTag({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Source link: ${href}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        fontSize: 11,
        textDecoration: "none",
      }}
    >
      🔗 <span style={{ whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{href}</span>
    </a>
  );
}
