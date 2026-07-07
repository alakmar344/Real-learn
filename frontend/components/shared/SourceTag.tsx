"use client";

// Security: `href` comes from AI-generated lesson content (and is persisted in
// localStorage), so it must be treated as untrusted. Only http(s) URLs are
// rendered as links — a `javascript:` or `data:` URI here would be a stored
// XSS executing in the app origin the moment a user clicks the chip.
function safeHttpUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    // not a parseable absolute URL
  }
  return null;
}

export default function SourceTag({ href }: { href: string }) {
  const safeHref = safeHttpUrl(href);
  if (!safeHref) {
    // Render unlinkable sources as inert text — never as a clickable URL.
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          color: "var(--text-tertiary)",
          fontSize: 11,
          minHeight: 32,
          maxWidth: 240,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        🔗 {href}
      </span>
    );
  }
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Source link: ${safeHref} (opens in new tab)`}
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
