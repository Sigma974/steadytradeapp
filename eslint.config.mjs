import nextConfig from "eslint-config-next";
import i18nextPlugin from "eslint-plugin-i18next";

export default [
  ...nextConfig,

  // ─── i18n: warn on hardcoded visible strings ──────────────────────────────
  {
    plugins: { i18next: i18nextPlugin },
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      // Every user-visible string must come from t(). Warn instead of error so
      // CI doesn't break on new additions, but reviewers are always informed.
      "i18next/no-literal-string": [
        "warn",
        {
          // Only check JSX markup, not raw TS logic (API calls, console, etc.)
          mode: "jsx-only",

          // Also lint these common UI attributes when they're raw strings
          "jsx-attributes": {
            include: ["placeholder", "aria-label", "title", "alt"],
          },

          // Ignore pure symbols, punctuation, and single-character tokens that
          // legitimately never need translation
          words: {
            exclude: [
              "^[\\s·—↗↑↓→←∞▲▼⚠%:./,;!?|@#$&*+\\-_()\\[\\]{}\"'`]+$",
              "^\\d+$",
              "^[A-Z0-9]{1,6}$",
            ],
          },
        },
      ],
    },
  },
];
