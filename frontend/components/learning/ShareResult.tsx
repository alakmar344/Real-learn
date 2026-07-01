"use client";

import { useState } from "react";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitle } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { showToast } from "@/components/shared/ToastContainer";

interface Props {
  question: string;
  totalScore: number;
  maxScore?: number;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      lines[maxLines - 1] = last.replace(/\s+\S*$/, "") + "…";
    }
  }
  return lines;
}

export default function ShareResult({ question, totalScore, maxScore = 6 }: Props) {
  const mounted = useMounted();
  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);
  const [busy, setBusy] = useState(false);

  const info = levelInfo(xp);

  const summaryText = `I scored ${totalScore}/${maxScore} learning "${question}" on RealLearn 📚 (Level ${info.level} · ${streak}-day streak 🔥) — https://reallearn.site/`;

  function drawCard(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const W = 1200;
      const H = 630;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      // Background — paper cream with a subtle oxford panel.
      ctx.fillStyle = "#f5f0e8";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a3a5c";
      ctx.fillRect(0, 0, W, 12);
      ctx.fillRect(0, H - 12, W, 12);

      // Brand
      ctx.fillStyle = "#1a3a5c";
      ctx.font = "800 46px Inter, sans-serif";
      ctx.fillText("Real", 72, 108);
      const realW = ctx.measureText("Real").width;
      ctx.fillStyle = "#2a5a8c";
      ctx.fillText("Learn", 72 + realW, 108);

      ctx.fillStyle = "#6b5a48";
      ctx.font = "400 22px Inter, sans-serif";
      ctx.fillText("The World Is Your Textbook", 74, 142);

      // Question
      ctx.fillStyle = "#1a1208";
      ctx.font = "700 52px Georgia, serif";
      const qLines = wrapText(ctx, `“${question}”`, W - 144, 3);
      qLines.forEach((ln, i) => ctx.fillText(ln, 72, 250 + i * 66));

      // Score ring
      const cx = W - 210;
      const cy = 210;
      const r = 96;
      const pct = totalScore / maxScore;
      ctx.lineWidth = 18;
      ctx.strokeStyle = "#e0d8cc";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = totalScore >= maxScore ? "#c9a227" : "#1a6b3a";
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1a1208";
      ctx.textAlign = "center";
      ctx.font = "800 56px Inter, sans-serif";
      ctx.fillText(`${totalScore}/${maxScore}`, cx, cy + 8);
      ctx.font = "400 22px Inter, sans-serif";
      ctx.fillStyle = "#6b5a48";
      ctx.fillText("SCORE", cx, cy + 44);
      ctx.textAlign = "left";

      // Footer stats pills
      const pills = [
        `⭐  Level ${info.level} · ${levelTitle(info.level)}`,
        `🔥  ${streak}-day streak`,
        totalScore >= maxScore ? "🏆  Perfect run" : "✅  Journey complete",
      ];
      ctx.font = "600 26px Inter, sans-serif";
      let px = 72;
      const py = H - 96;
      pills.forEach((p) => {
        const w = ctx.measureText(p).width + 44;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#c8bfb0";
        ctx.lineWidth = 2;
        const rr = 26;
        ctx.beginPath();
        ctx.roundRect(px, py, w, 52, rr);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1a3a5c";
        ctx.fillText(p, px + 22, py + 35);
        px += w + 18;
      });

      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await drawCard();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (blob) {
        const file = new File([blob], "reallearn-result.png", { type: "image/png" });
        if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ title: "RealLearn", text: summaryText, files: [file] });
          setBusy(false);
          return;
        }
        // Fallback: download the image.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "reallearn-result.png";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Result card downloaded 📸", "success");
      }
    } catch (err) {
      console.log("[frontend][ShareResult] share failed", err);
      showToast("Could not share right now.", "error");
    }
    setBusy(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      showToast("Copied to clipboard 📋", "success");
    } catch {
      showToast("Could not copy.", "error");
    }
  }

  if (!mounted) return null;

  const btn = (primary: boolean): React.CSSProperties => ({
    border: primary ? "none" : "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    background: primary ? "var(--accent)" : "transparent",
    color: primary ? "#faf7f2" : "var(--text-secondary)",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: primary ? 700 : 600,
    minHeight: 44,
    boxShadow: primary ? "var(--shadow-sm)" : "none",
  });

  return (
    <div style={{ marginTop: "var(--space-md)", display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
      <button type="button" onClick={handleShare} disabled={busy} style={btn(true)}>
        {busy ? "Preparing…" : "📸 Share result"}
      </button>
      <button type="button" onClick={handleCopy} style={btn(false)}>
        Copy text
      </button>
    </div>
  );
}
