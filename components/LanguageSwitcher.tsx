"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(newLocale: string) {
    if (newLocale === locale) return;

    let newPath: string;
    if (newLocale === "fr") {
      newPath = "/fr" + (pathname === "/" ? "" : pathname);
    } else {
      newPath = pathname.replace(/^\/fr/, "") || "/";
    }

    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    router.push(newPath);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => switchTo("en")}
        className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
          locale === "en"
            ? "bg-slate-700 text-slate-100"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        EN
      </button>
      <span className="text-slate-700 text-xs select-none">·</span>
      <button
        onClick={() => switchTo("fr")}
        className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
          locale === "fr"
            ? "bg-slate-700 text-slate-100"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        FR
      </button>
    </div>
  );
}
