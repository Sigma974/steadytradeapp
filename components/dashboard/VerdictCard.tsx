import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { SyncData } from "@/lib/api-types";
import { calculateVerdict, type VerdictType } from "@/lib/insights/verdict";

const STYLES: Record<
  VerdictType,
  { card: string; iconBg: string; icon: string; actionBg: string }
> = {
  warning: {
    card: "bg-red-950/50 border-red-900/50",
    iconBg: "text-red-400",
    icon: "⚠",
    actionBg: "bg-red-900/40 text-red-200",
  },
  success: {
    card: "bg-emerald-950/50 border-emerald-900/50",
    iconBg: "text-emerald-400",
    icon: "✓",
    actionBg: "bg-emerald-900/40 text-emerald-200",
  },
  info: {
    card: "bg-blue-950/50 border-blue-900/50",
    iconBg: "text-blue-400",
    icon: "ℹ",
    actionBg: "bg-blue-900/40 text-blue-200",
  },
};

interface Props {
  data: SyncData;
}

export default function VerdictCard({ data }: Props) {
  const t = useTranslations("Cards.Verdict");

  if (data.tradeCount < 10) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
        <p className="text-sm text-slate-500">{t("notEnough")}</p>
      </div>
    );
  }

  const verdict = useMemo(() => calculateVerdict(data), [data]);
  if (!verdict) return null;

  const s = STYLES[verdict.type];
  const titleKey = `${verdict.key}.title` as Parameters<typeof t>[0];
  const explKey = `${verdict.key}.explanation` as Parameters<typeof t>[0];
  const actionKey = `${verdict.key}.action` as Parameters<typeof t>[0];

  return (
    <div className={`rounded-xl border ${s.card} px-5 py-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <span className={`text-xl leading-none mt-0.5 shrink-0 select-none ${s.iconBg}`}>
          {s.icon}
        </span>
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 leading-snug">
            {t(titleKey)}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t(explKey, verdict.params)}
          </p>
        </div>
      </div>
      <div className={`rounded-lg px-3 py-2 flex items-start gap-2 text-xs font-medium ${s.actionBg}`}>
        <span className="shrink-0 mt-px select-none">→</span>
        <span>{t(actionKey)}</span>
      </div>
    </div>
  );
}
