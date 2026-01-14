import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        sand: "var(--sand)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-3": "var(--accent-3)"
      },
      fontFamily: {
        sans: ["var(--font-grotesk)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        glow: "0 18px 60px rgba(139, 92, 246, 0.35)",
        soft: "0 12px 40px rgba(3, 6, 18, 0.35)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.96)", opacity: "0.6" },
          "100%": { transform: "scale(1.08)", opacity: "0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
