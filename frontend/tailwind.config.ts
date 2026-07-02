import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101317",
        fog: "#f6f4ee",
        steel: "#60717c",
        ember: "#d45f3a",
        basil: "#1d6f5f",
        chartreuse: "#b7ca5d",
        graphite: "#202429"
      },
      boxShadow: {
        "soft": "0 24px 70px rgba(16, 19, 23, 0.13)",
        "line": "inset 0 0 0 1px rgba(16, 19, 23, 0.08)"
      }
    },
  },
  plugins: [],
};

export default config;
