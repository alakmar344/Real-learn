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

  const summaryText = `don't believe me? just saw this on RealLearn and now I'm built different 🔥 https://reallearn.site/`;

  function drawCard(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      // Vibrant neon background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#ff00cc");
      bgGrad.addColorStop(0.35, "#7b2ff7");
      bgGrad.addColorStop(0.65, "#2f80ed");
      bgGrad.addColorStop(1, "#00d2ff");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Decorative diagonal stripes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 40;
      for (let i = -H; i < W + H; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }

      // Sparkle / star decorations
      const drawStar = (cx: number, cy: number, r: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();
        ctx.restore();
      };
      drawStar(160, 420, 60, 0.3);
      drawStar(W - 140, 560, 80, 0.7);
      drawStar(120, 1100, 50, 1.1);
      drawStar(W - 160, 1350, 90, 0.5);
      drawStar(260, 1550, 40, 0.9);

      // Top brand — comedic huge logo
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 140px Inter, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 40;
      ctx.fillText("Real", W / 2 - 180, 240);
      ctx.fillStyle = "#ffe600";
      ctx.fillText("Learn", W / 2 + 120, 240);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.font = "500 40px Inter, sans-serif";
      ctx.fillText("THE WORLD IS YOUR TEXTBOOK", W / 2, 310);

      // Glitch accent bar
      ctx.fillStyle = "#ffe600";
      ctx.fillRect(100, 360, W - 200, 14);

      // Question box — glass card
      const boxX = 80;
      const boxY = 420;
      const boxW = W - 160;
      const boxH = 420;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 40);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "400 46px Inter, sans-serif";
      ctx.fillText("⚡ LESSON PROMPT ⚡", W / 2, boxY + 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 60px Georgia, serif";
      const qLines = wrapText(ctx, question, boxW - 40, 4);
      const qStartY = boxY + 160;
      qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, qStartY + i * 90));
      ctx.textAlign = "left";

      // Score halo
      const cx = W / 2;
      const cy = H / 2 + 280;
      const r = 190;
      const pct = totalScore / maxScore;

      // Outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6);
      glowGrad.addColorStop(0, "rgba(255, 230, 0, 0.6)");
      glowGrad.addColorStop(1, "rgba(255, 230, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Ring background
      ctx.lineWidth = 38;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Score ring
      ctx.strokeStyle = totalScore >= maxScore ? "#ffe600" : "#ffffff";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 140px Inter, sans-serif";
      ctx.fillText(`${totalScore}`, cx, cy + 30);
      ctx.font = "600 36px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(`out of ${maxScore}`, cx, cy + 80);
      ctx.fillStyle = "#ffe600";
      ctx.fillText(totalScore >= maxScore ? "PERFECT 🔥" : "JOURNEY COMPLETE", cx, cy + 130);
      ctx.textAlign = "left";

      // Stats row — glass pills
      const pills = [
        `⭐  Level ${info.level} · ${levelTitle(info.level)}`,
        `🔥 ${streak}-day streak`,
        totalScore >= maxScore ? "🏆  Perfect run" : "✅  Journey complete",
      ];
      ctx.font = "700 36px Inter, sans-serif";
      let px = 90;
      const py = H - 340;
      pills.forEach((p) => {
        const w = ctx.measureText(p).width + 60;
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(px, py, w, 76, 38);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(p, px + 30, py + 50);
        px += w + 24;
      });

      // CTA banner
      const ctaY = H - 210;
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.roundRect(80, ctaY, W - 160, 130, 20);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.textAlign = "center";
      ctx.fillStyle = "#1a0a66";
      ctx.font = "900 52px Inter, sans-serif";
      ctx.fillText("👉  REALLEARN.SITE  👈", W / 2, ctaY + 82);

      // Bottom tag
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "400 30px Inter, sans-serif";
      ctx.fillText("Share this if you’re smarter now", W / 2, H - 60);

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
