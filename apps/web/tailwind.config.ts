import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F172A", // Deep Navy
          accent: "#EF4444", // Korean-flag red
          gold: "#D4AF37",   // Premium Gold
          muted: "#1E293B",
        },
        surface: {
          DEFAULT: "#F8FAFC",
          card: "#FFFFFF",
        }
      },
      backgroundImage: {
        "gradient-premium": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        "gradient-accent": "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
