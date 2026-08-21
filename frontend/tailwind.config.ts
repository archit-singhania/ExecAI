import type { Config } from "tailwindcss";

/**
 * Everything here maps onto a CSS custom property defined in
 * src/styles/tokens.css. Adding a raw value to this file is a bug — add the
 * token first, then reference it. That constraint is what keeps the app
 * visually consistent as it grows.
 */
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
        accent: "rgb(var(--color-accent) / <alpha-value>)",

        // Semantic roles — prefer these over the raw brand names below.
        positive: "rgb(var(--color-positive) / <alpha-value>)",
        caution: "rgb(var(--color-caution) / <alpha-value>)",
        critical: "rgb(var(--color-critical) / <alpha-value>)",

        // Elevation-aware surfaces (dark mode gets lighter as it rises).
        "surface-sunken": "rgb(var(--surface-sunken) / <alpha-value>)",
        "surface-base": "rgb(var(--surface-base) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        "surface-overlay": "rgb(var(--surface-overlay) / <alpha-value>)",

        // Retained for backwards compatibility with existing markup.
        // New work should use positive / caution / critical instead.
        ember: "rgb(var(--color-critical) / <alpha-value>)",
        basil: "rgb(var(--color-positive) / <alpha-value>)",
        chartreuse: "rgb(var(--color-caution) / <alpha-value>)",
        graphite: "#202429",
      },

      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        full: "var(--r-full)",
      },

      boxShadow: {
        0: "var(--elev-0)",
        1: "var(--elev-1)",
        2: "var(--elev-2)",
        3: "var(--elev-3)",
        4: "var(--elev-4)",
        5: "var(--elev-5)",

        // Legacy aliases mapped onto the ramp so old markup gets the new look.
        soft: "var(--elev-4)",
        line: "inset 0 0 0 1px var(--line)",
        "line-dark": "inset 0 0 0 1px var(--line)",
      },

      borderColor: {
        DEFAULT: "var(--line)",
        faint: "var(--line-faint)",
        hairline: "var(--line)",
        strong: "var(--line-strong)",
      },

      transitionTimingFunction: {
        out: "var(--e-out)",
        inout: "var(--e-inout)",
        spring: "var(--e-spring)",
        exit: "var(--e-exit)",
      },

      transitionDuration: {
        instant: "var(--d-instant)",
        fast: "var(--d-fast)",
        base: "var(--d-base)",
        slow: "var(--d-slow)",
        scene: "var(--d-scene)",
      },

      zIndex: {
        base: "var(--z-base)",
        raised: "var(--z-raised)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        sheet: "var(--z-sheet)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        cursor: "var(--z-cursor)",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },

      fontSize: {
        xs: ["var(--t-xs)", { lineHeight: "var(--lh-base)" }],
        sm: ["var(--t-sm)", { lineHeight: "var(--lh-base)" }],
        base: ["var(--t-base)", { lineHeight: "var(--lh-base)" }],
        lg: ["var(--t-lg)", { lineHeight: "var(--lh-snug)" }],
        xl: ["var(--t-xl)", { lineHeight: "var(--lh-snug)" }],
        "2xl": ["var(--t-2xl)", { lineHeight: "var(--lh-tight)" }],
        "3xl": ["var(--t-3xl)", { lineHeight: "var(--lh-tight)" }],
        hero: ["var(--t-hero)", { lineHeight: "var(--lh-tight)" }],
      },

      letterSpacing: {
        tightest: "var(--track-tight)",
        widest: "var(--track-wide)",
      },
    },
  },
  plugins: [],
};

export default config;
