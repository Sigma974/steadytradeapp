import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr"] as const,
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: {
    name: "NEXT_LOCALE",
    sameSite: "lax",
  },
});
