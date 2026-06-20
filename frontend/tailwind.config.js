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
        /* Textbook palette (matches globals.css) */
        background: "#f5f0e8",
        surface: "#faf7f2",
        card: "#ffffff",
        "card-hover": "#f0ebe0",
        border: "#c8bfb0",
        "border-subtle": "#e0d8cc",
        accent: "#1a3a5c",
        "accent-light": "rgba(26,58,92,0.08)",
        "accent-glow": "rgba(26,58,92,0.15)",
        "text-primary": "#1a1208",
        "text-secondary": "#4a3f2f",
        "text-tertiary": "#8a7a6a",
        success: "#1a6b3a",
        "success-light": "rgba(26,107,58,0.08)",
        danger: "#8b2020",
        "danger-light": "rgba(139,32,32,0.08)",
        physics: "#1a3a5c",
        chemistry: "#1a6b3a",
        economics: "#7a4f1a",
        biology: "#6b1a4a",
        cs: "#2a1a6b",
        history: "#6b1a1a",
        general: "#1a3a5c",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
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
          "0%": { background: "transparent", boxShadow: "0 0 0 rgba(26,58,92,0)" },
          "40%": { background: "rgba(26,58,92,0.12)", boxShadow: "0 0 40px rgba(26,58,92,0.25)" },
          "100%": { background: "transparent", boxShadow: "0 0 0 rgba(26,58,92,0)" },
        },
        unlockPop: {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 20px rgba(26,58,92,0.2)" },
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
