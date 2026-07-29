"use client";

import { useState } from "react";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitle } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { showToast } from "@/components/shared/ToastContainer";
import { SHARE_CARD } from "@/lib/palette";

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

  const summaryText = `think you can pass it? score: ${totalScore}/${maxScore} on RealLearn — https://reallearn.site/`;

  function drawCard(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      // Solid paper canvas (light theme for feed legibility)
      ctx.fillStyle = SHARE_CARD.paper;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid texture
      ctx.strokeStyle = SHARE_CARD.border;
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 54) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 54) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Brand header
      ctx.textAlign = "center";
      ctx.font = "900 92px Inter, sans-serif";
      ctx.fillStyle = SHARE_CARD.ink;
      ctx.fillText("Real", W / 2 + 10, 180);
      ctx.fillStyle = SHARE_CARD.brand;
      ctx.fillText("Learn", W / 2 + 10, 280);
      ctx.font = "600 36px Inter, sans-serif";
      ctx.fillStyle = SHARE_CARD.inkSoft;
      ctx.fillText("THE WORLD IS YOUR TEXTBOOK", W / 2, 340);
      ctx.textAlign = "left";

      // Decorative accent line
      const lineGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
      lineGrad.addColorStop(0, "rgba(238, 81, 37, 0)");
      lineGrad.addColorStop(0.5, "rgba(238, 81, 37, 0.55)");
      lineGrad.addColorStop(1, "rgba(238, 81, 37, 0)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, 400);
      ctx.lineTo(W - 80, 400);
      ctx.stroke();
      ctx.lineWidth = 1;

      // Question area
      const boxY = 460;
      ctx.fillStyle = SHARE_CARD.card;
      ctx.strokeStyle = SHARE_CARD.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(72, boxY, W - 144, 480, 40);
      ctx.fill();
      ctx.stroke();

      // Edge accent dots (simulate corner tech lights)
      const dot = (dx: number, dy: number) => {
        ctx.beginPath();
        ctx.arc(72 + dx, boxY + dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = SHARE_CARD.mint;
        ctx.fill();
      };
      dot(0, 0);
      dot(W - 72 - 72, 0);
      dot(0, 480);
      dot(W - 72 - 72, 480);

      ctx.textAlign = "center";
      ctx.fillStyle = SHARE_CARD.brandBright;
      ctx.font = "600 42px Inter, sans-serif";
      ctx.fillText("QUESTION", W / 2, boxY + 70);

      ctx.fillStyle = SHARE_CARD.ink;
      ctx.font = "700 56px 'Space Grotesk', Inter, sans-serif";
      const qLines = wrapText(ctx, question, W - 184, 4);
      const qStartY = boxY + 160;
      qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, qStartY + i * 90));
      ctx.textAlign = "left";

      // Stats row — clean bordered glass pills
      const pills = [
        { text: `⭐ Level ${info.level} · ${levelTitle(info.level)}`, color: SHARE_CARD.brand },
        { text: `🔥 ${streak}-day streak`, color: SHARE_CARD.amber },
        totalScore >= maxScore ? { text: "🏆 Perfect run", color: SHARE_CARD.amber } : { text: "✅ Completed", color: SHARE_CARD.mint },
      ];
      ctx.font = "700 34px Inter, sans-serif";
      let px = 72;
      const py = H - 560;
      pills.forEach((p) => {
        const w = ctx.measureText(p.text).width + 48;
        const ph = 66;
        // glass background
        ctx.fillStyle = SHARE_CARD.card;
        ctx.strokeStyle = SHARE_CARD.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px, py, w, ph, 20);
        ctx.fill();
        ctx.stroke();
        // colored left rail
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(px, py + 10, 6, ph - 20, 3);
        ctx.fill();
        // text
        ctx.fillStyle = SHARE_CARD.ink;
        ctx.fillText(p.text, px + 30, py + 42);
        px += w + 20;
      });

      // Score block — centered vertical composition
      const cx = W / 2;
      const cy = H - 310;
      const r = 160;

      // Thin decorative ring track
      ctx.lineWidth = 18;
      ctx.strokeStyle = SHARE_CARD.border;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      const pct = totalScore / maxScore;

      // Progress arc
      const arcGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      arcGrad.addColorStop(0, SHARE_CARD.brandBright);
      arcGrad.addColorStop(1, SHARE_CARD.mint);
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
      ctx.lineCap = "butt";

      // Big score + "/ max" side by side, centered as one block — drawing
      // both center-aligned at the same point painted them on top of each
      // other, making the score illegible on every share card.
      const scoreFont = "900 130px Inter, sans-serif";
      const fracFont = "600 34px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.font = scoreFont;
      const scoreWidth = ctx.measureText(`${totalScore}`).width;
      ctx.font = fracFont;
      const fracWidth = ctx.measureText(` / ${maxScore}`).width;
      const scoreStartX = cx - (scoreWidth + fracWidth) / 2;

      ctx.font = scoreFont;
      ctx.fillStyle = SHARE_CARD.ink;
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 25;
      ctx.fillText(`${totalScore}`, scoreStartX, cy + 32);
      ctx.shadowBlur = 0;

      ctx.font = fracFont;
      ctx.fillStyle = SHARE_CARD.inkSoft;
      ctx.fillText(` / ${maxScore}`, scoreStartX + scoreWidth, cy + 32);

      ctx.textAlign = "center";
      ctx.font = "700 32px Inter, sans-serif";
      ctx.fillStyle = SHARE_CARD.brandBright;
      ctx.fillText(totalScore >= maxScore ? "PERFECT" : "COMPLETED", cx, cy + 80);

      ctx.textAlign = "left";

      // CTA band — prominent but structured
      const ctaY = H - 130;
      ctx.fillStyle = SHARE_CARD.brand;
      ctx.shadowColor = "rgba(4, 120, 87, 0.35)";
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.roundRect(72, ctaY, W - 144, 100, 18);
      ctx.fill();
      ctx.shadowBlur = 0;

      // subtle inner top line highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.roundRect(72, ctaY, W - 144, 8, 8);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = SHARE_CARD.card;
      ctx.font = "900 46px Inter, sans-serif";
      ctx.fillText("👉  REALLEARN.SITE  👈", W / 2, ctaY + 65);

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
        showToast("Result card downloaded", "success");
      }
    } catch (err) {
      // Dismissing the native share sheet rejects with AbortError — that's a
      // deliberate user choice, not a failure; don't show an error toast.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.log("[frontend][ShareResult] share failed", err);
        showToast("Could not share right now.", "error");
      }
    }
    setBusy(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Could not copy.", "error");
    }
  }

  if (!mounted) return null;

  const btn = (primary: boolean): React.CSSProperties => ({
    border: primary ? "none" : "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    background: primary ? "var(--accent)" : "transparent",
    color: primary ? "var(--on-accent)" : "var(--text-secondary)",
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
        {busy ? "Preparing…" : "Share result"}
      </button>
      <button type="button" onClick={handleCopy} style={btn(false)}>
        Copy text
      </button>
    </div>
  );
}
