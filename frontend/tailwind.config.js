/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Dark theme palette (matches globals.css) */
        background: "#0a0a0a",
        surface: "#111111",
        card: "#1a1a1a",
        "card-hover": "#202020",
        border: "#2a2a2a",
        "border-subtle": "#1f1f1f",
        accent: "#f5c518",
        "accent-light": "rgba(245,197,24,0.15)",
        "accent-glow": "rgba(245,197,24,0.3)",
        "text-primary": "#f0f0f0",
        "text-secondary": "#9ca3af",
        "text-tertiary": "#6b7280",
        success: "#10b981",
        "success-light": "rgba(16,185,129,0.12)",
        danger: "#ef4444",
        "danger-light": "rgba(239,68,68,0.12)",
        physics: "#3b82f6",
        chemistry: "#10b981",
        economics: "#f59e0b",
        biology: "#ec4899",
        cs: "#8b5cf6",
        history: "#ef4444",
        general: "#f5c518",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in-right": "slideInRight 0.3s ease-in-out",
        "slide-in-up": "slideInUp 0.3s ease-in-out",
        "fade-up": "fadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-bottom": "slideFromBottom 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "gold-flash": "goldFlash 800ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "unlock-pop": "unlockPop 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shake: "shake 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "correct-pulse": "correctPulse 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2s infinite",
        spin: "spin 1s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideFromBottom: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        goldFlash: {
          "0%": { background: "transparent", boxShadow: "0 0 0 rgba(245,197,24,0)" },
          "40%": { background: "rgba(245,197,24,0.18)", boxShadow: "0 0 40px rgba(245,197,24,0.35)" },
          "100%": { background: "transparent", boxShadow: "0 0 0 rgba(245,197,24,0)" },
        },
        unlockPop: {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 20px rgba(245,197,24,0.25)" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        correctPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
