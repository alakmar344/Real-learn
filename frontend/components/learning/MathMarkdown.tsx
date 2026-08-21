"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const REMARK_MATH_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_MATH_PLUGINS = [rehypeKatex];

interface MathMarkdownProps {
  content: string;
  components?: React.ComponentProps<typeof ReactMarkdown>["components"];
}

const MathMarkdown = memo(function MathMarkdown({ content, components }: MathMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_MATH_PLUGINS}
      rehypePlugins={REHYPE_MATH_PLUGINS}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
});

export default MathMarkdown;
