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

function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M10 14a5 5 0 0 0 7.07 0l3.18-3.18a5 5 0 0 0-7.07-7.07L11.4 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 10a5 5 0 0 0-7.07 0l-3.18 3.18a5 5 0 0 0 7.07 7.07l1.77-1.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
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
        <LinkIcon /> {href}
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
      <LinkIcon />{" "}
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
