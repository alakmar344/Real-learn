"use client";

export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
      onFocus={(e) => {
        const el = e.currentTarget;
        el.style.left = "16px";
        el.style.top = "16px";
        el.style.width = "auto";
        el.style.height = "auto";
        el.style.overflow = "visible";
        el.style.zIndex = "9999";
        el.style.padding = "8px 16px";
        el.style.background = "var(--accent)";
        el.style.color = "var(--on-accent)";
        el.style.borderRadius = "var(--radius-md)";
        el.style.textDecoration = "none";
        el.style.fontWeight = "600";
      }}
      onBlur={(e) => {
        const el = e.currentTarget;
        el.style.left = "-9999px";
        el.style.top = "auto";
        el.style.width = "1px";
        el.style.height = "1px";
        el.style.overflow = "hidden";
      }}
    >
      Skip to main content
    </a>
  );
}
