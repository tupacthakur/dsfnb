import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "var(--midnight)",
        indigo: "var(--indigo)",
        surface: "var(--surface)",
        mint: "var(--mint)",
        "midnight-800": "var(--midnight-800)",
        "midnight-700": "var(--midnight-700)",
        "midnight-600": "var(--midnight-600)",
        "indigo-dim": "var(--indigo-dim)",
        "indigo-glow": "var(--indigo-glow)",
        "mint-dim": "var(--mint-dim)",
        amber: "var(--amber)",
        red: "var(--red)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
      transitionDuration: {
        180: "180ms",
        200: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;

