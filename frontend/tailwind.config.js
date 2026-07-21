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
        /* Mapped to the CSS variables in globals.css so utility classes stay
           correct in EVERY theme — India's tricolor palette (saffron light,
           emerald night, tricolor unity) propagates through these tokens. */
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        border: "var(--border-default)",
        "border-subtle": "var(--border-subtle)",
        "border-glow": "var(--border-glow)",
        accent: "var(--accent)",
        "accent-companion": "var(--accent-companion)",
        "accent-light": "var(--accent-dim)",
        "accent-glow": "var(--accent-glow)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-accent": "var(--text-accent-strong)",
        success: "var(--correct)",
        "success-light": "var(--correct-bg)",
        danger: "var(--wrong)",
        "danger-light": "var(--wrong-bg)",
        /* Extended tricolor palette — saffron, white, green — celebrating India's diversity */
        "cobalt-deep": "var(--cobalt-deep)",
        "cobalt-mid": "var(--cobalt-mid)",
        "cobalt-vivid": "var(--cobalt-vivid)",
        "cobalt-pale": "var(--cobalt-pale)",
        "cobalt-wash": "var(--cobalt-wash)",
        "cobalt-ink": "var(--cobalt-ink)",
        physics: "var(--subject-physics)",
        chemistry: "var(--subject-chemistry)",
        economics: "var(--subject-economics)",
        biology: "var(--subject-biology)",
        cs: "var(--subject-cs)",
        history: "var(--subject-history)",
        general: "var(--subject-general)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in-right": "slideInRight 0.3s ease-in-out",
        "slide-in-up": "slideInUp 0.3s ease-in-out",
        "fade-up": "fadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-bottom": "slideFromBottom 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "accent-flash": "accentFlash 800ms cubic-bezier(0.16, 1, 0.3, 1) both",
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
        accentFlash: {
          "0%": { background: "transparent", boxShadow: "0 0 0 transparent" },
          "40%": { background: "var(--accent-dim)", boxShadow: "0 0 20px var(--accent-glow)" },
          "100%": { background: "transparent", boxShadow: "0 0 0 transparent" },
        },
        unlockPop: {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)" },
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
