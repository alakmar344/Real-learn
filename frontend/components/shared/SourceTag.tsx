"use client";

export default function SourceTag({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Source link: ${href} (opens in new tab)`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        fontSize: 11,
        textDecoration: "none",
        minHeight: 32,
        transition: "border-color 150ms var(--ease-color)",
      }}
    >
      🔗{" "}
      <span
        style={{
          whiteSpace: "nowrap",
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {href}
      </span>
    </a>
  );
}
