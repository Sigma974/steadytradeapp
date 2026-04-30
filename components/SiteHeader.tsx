"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";

interface Props {
  tagline?: string;
}

export default function SiteHeader({ tagline }: Props) {
  const locale = useLocale();
  const homeHref = locale === "fr" ? "/fr" : "/";

  return (
    <header className="border-b border-slate-800 px-6 py-4 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={homeHref}
            className="text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors"
          >
            Steady
          </Link>
          {tagline && (
            <span className="text-xs text-slate-500 hidden sm:inline">{tagline}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
