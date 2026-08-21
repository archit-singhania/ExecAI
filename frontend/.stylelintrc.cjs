/**
 * Stylelint is the thing that stops the design system drifting back into
 * eleven hand-rolled prefixes. The rules below are deliberately narrow: they
 * do not police formatting (prettier does that), they police whether new CSS
 * uses the token layer.
 *
 *   npx stylelint "src/**\/*.css"
 *
 * globals.css is exempted for now because it predates the token system.
 * As blocks migrate out of it into src/styles/, delete that override — the
 * shrinking exemption list is the migration progress bar.
 */
module.exports = {
  extends: ["stylelint-config-standard"],

  rules: {
    // Tailwind + our own at-rules
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "variants",
          "responsive",
          "screen",
          "supports",
          "view-transition",
        ],
      },
    ],

    // --- Token enforcement -------------------------------------------------
    // Raw colours are the single most common way a design system rots.
    "color-no-hex": true,
    "color-named": "never",

    // Radius, duration and easing must come from tokens.
    "declaration-property-value-allowed-list": {
      "border-radius": ["/^var\\(--r-/", "/^0$/", "inherit"],
      "transition-timing-function": ["/^var\\(--e-/", "inherit"],
      "animation-timing-function": ["/^var\\(--e-/", "inherit", "linear", "steps(.*)"],
      "z-index": ["/^var\\(--z-/", "/^-?[0-2]$/", "auto"],
    },

    // `linear` easing is the strongest single signal of an unconsidered UI.
    "declaration-property-value-disallowed-list": {
      transition: ["/linear/"],
    },

    "custom-property-pattern": null,
    "selector-class-pattern": null,
    "no-descending-specificity": null,
    "declaration-block-no-redundant-longhand-properties": null,
  },

  overrides: [
    {
      // Predates the token system. Shrink this list as blocks migrate into
      // src/styles/ — when it's empty, the migration is done.
      files: ["src/app/globals.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "declaration-property-value-allowed-list": null,
        "declaration-property-value-disallowed-list": null,
      },
    },
    {
      // Tokens are where raw values are *supposed* to live.
      files: ["src/styles/tokens.css"],
      rules: {
        "color-no-hex": null,
        "declaration-property-value-allowed-list": null,
      },
    },
  ],
};
