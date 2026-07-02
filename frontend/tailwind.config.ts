import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
      },
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        fog: "rgb(var(--color-fog) / <alpha-value>)",
        steel: "rgb(var(--color-steel) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ember: "#d45f3a",
        basil: "#1d6f5f",
        chartreuse: "#b7ca5d",
        graphite: "#202429",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 24px 70px rgba(16, 19, 23, 0.13)",
        line: "inset 0 0 0 1px rgba(16, 19, 23, 0.08)",
        "line-dark": "inset 0 0 0 1px rgba(246, 244, 238, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
