"use client";

import { useMemo, memo, useEffect, useState } from "react";

// KaTeX (~270 kB min) is loaded on demand, not statically. MathText is
// imported by always-mounted chrome (Sidebar → AppShell → root layout), so a
// static `import katex` dragged the whole library into the shared, every-route
// bundle even on pages that never render math. Lazy-loading keeps it out of
// First Load JS; math renders as plain text for the one tick before the
// library resolves (and never renders at all when the text has no math).
type KatexModule = typeof import("katex")["default"];

let katexPromise: Promise<KatexModule> | null = null;
function loadKatex(): Promise<KatexModule> {
  if (!katexPromise) {
    katexPromise = import("katex").then((m) => m.default);
  }
  return katexPromise;
}

interface Props {
  text: string;
  className?: string;
}

/** HTML-escape a string so it is safe inside dangerouslySetInnerHTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMath(katex: KatexModule, latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    // SECURITY: the result of this function is injected via
    // dangerouslySetInnerHTML, and `latex` originates from AI-generated
    // (user-steerable, cached-and-shared) lesson content. Returning the raw
    // string here would be a stored-XSS sink if KaTeX ever throws a
    // non-ParseError. Escape the fallback so it degrades to visible text.
    return escapeHtml(latex);
  }
}

function parseMathText(text: string): Array<{ type: "text" | "math-inline" | "math-display"; content: string }> {
  const parts: Array<{ type: "text" | "math-inline" | "math-display"; content: string }> = [];
  // Match $$...$$ (display math) first, then $...$ (inline math)
  const regex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // $$...$$ display math
      parts.push({ type: "math-display", content: match[1].trim() });
    } else if (match[2] !== undefined) {
      // $...$ inline math
      parts.push({ type: "math-inline", content: match[2].trim() });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If no math was found, return the whole text as one part
  if (parts.length === 0) {
    parts.push({ type: "text", content: text });
  }

  return parts;
}

function MathTextBase({ text, className }: Props) {
  const parts = useMemo(() => parseMathText(text), [text]);
  const hasMath = useMemo(() => parts.some((p) => p.type !== "text"), [parts]);
  const [katex, setKatex] = useState<KatexModule | null>(null);

  useEffect(() => {
    if (!hasMath || katex) return;
    let active = true;
    loadKatex().then((mod) => {
      if (active) setKatex(mod);
    });
    return () => {
      active = false;
    };
  }, [hasMath, katex]);

  if (!hasMath) {
    return <>{text}</>;
  }

  // Until KaTeX resolves, show the raw text so the layout is stable and no
  // content is hidden (delimiters are briefly visible on the rare surfaces
  // that contain math outside the /learn route).
  if (!katex) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }
        const html = renderMath(katex, part.content, part.type === "math-display");
        return (
          <span
            key={i}
            className={part.type === "math-display" ? "math-display-inline" : "math-inline-katex"}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

export default memo(MathTextBase);
