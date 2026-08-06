"use client";

import { useMemo, memo } from "react";
import katex from "katex";

interface Props {
  text: string;
  className?: string;
}

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    return latex;
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

  const hasMath = parts.some((p) => p.type !== "text");
  if (!hasMath) {
    return <>{text}</>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }
        const html = renderMath(
          part.content,
          part.type === "math-display"
        );
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
