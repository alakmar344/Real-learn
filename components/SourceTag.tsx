"use client";

interface SourceTagProps {
  url: string;
  index?: number;
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`;
  } catch {
    return "";
  }
}

export default function SourceTag({ url, index = 0 }: SourceTagProps) {
  if (!url || url === "#") return null;

  const domain = getDomain(url);
  const favicon = getFavicon(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border rounded-full text-xs text-text-secondary hover:text-text-primary hover:border-accent/50 transition-all group"
    >
      {favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={favicon}
          alt=""
          className="w-3 h-3 rounded-full opacity-70 group-hover:opacity-100"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <span>[{index + 1}]</span>
      <span className="max-w-[120px] truncate">{domain}</span>
      <svg
        className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
