"use client";

import { useTranslations } from "next-intl";

interface Props {
  cacheAgeMinutes: number;
  onRefresh: () => void;
}

export default function CacheIndicator({ cacheAgeMinutes, onRefresh }: Props) {
  const t = useTranslations("Period");
  return (
    <span className="flex items-center gap-2">
      <span>{t("cached")}</span>
      <span>{cacheAgeMinutes < 1 ? t("justNow") : t("minutesAgo", { n: cacheAgeMinutes })}</span>
      <button
        onClick={onRefresh}
        className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
      >
        {t("refresh")}
      </button>
    </span>
  );
}
