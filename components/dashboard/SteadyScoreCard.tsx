"use client";

import { useMemo, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import type { SyncData } from "@/lib/api-types";
import {
  calculateSteadyScore,
  type ScoreLabelKey,
  type ScoreSignal,
  type SignalKey,
} from "@/lib/insights/steadyScore";

interface Props {
  data: SyncData;
  daysBack: number | null;
}

interface Colors {
  text: string;
  bar: string;
  card: string;
  philosophyBg: string;
}

function scoreColors(score: number): Colors {
  if (score >= 80)
    return {
      text: "text-emerald-400",
      bar: "bg-emerald-500",
      card: "border-emerald-900/40",
      philosophyBg: "bg-emerald-950/40 border-emerald-900/30",
    };
  if (score >= 65)
    return {
      text: "text-green-300",
      bar: "bg-green-400",
      card: "border-green-900/30",
      philosophyBg: "bg-green-950/40 border-green-900/30",
    };
  if (score >= 50)
    return {
      text: "text-yellow-400",
      bar: "bg-yellow-500",
      card: "border-yellow-900/40",
      philosophyBg: "bg-yellow-950/40 border-yellow-900/30",
    };
  if (score >= 35)
    return {
      text: "text-orange-400",
      bar: "bg-orange-500",
      card: "border-orange-900/40",
      philosophyBg: "bg-orange-950/40 border-orange-900/30",
    };
  return {
    text: "text-red-400",
    bar: "bg-red-500",
    card: "border-red-900/40",
    philosophyBg: "bg-red-950/40 border-red-900/30",
  };
}

function SignalRow({
  signal,
  barColor,
  t,
}: {
  signal: ScoreSignal;
  barColor: string;
  t: ReturnType<typeof useTranslations<"Cards.SteadyScore">>;
}) {
  const nameKey = `signals.${signal.key}` as Parameters<typeof t>[0];

  if (signal.excluded) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="w-24 shrink-0 truncate">{t(nameKey)}</span>
        <span className="font-mono w-10 shrink-0 text-right">—/{signal.baseWeight}</span>
        <div className="flex-1 h-1.5 bg-slate-800/60 rounded-full" />
      </div>
    );
  }

  const contribution = Math.round((signal.signalScore * signal.baseWeight) / 100);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-slate-400">{t(nameKey)}</span>
      <span className="font-mono text-slate-300 w-10 shrink-0 text-right">
        {contribution}/{signal.baseWeight}
      </span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${signal.signalScore}%` }}
        />
      </div>
    </div>
  );
}

export default function SteadyScoreCard({ data, daysBack }: Props) {
  const t = useTranslations("Cards.SteadyScore");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownHovered, setBreakdownHovered] = useState(false);
  const [philosophyVisible, setPhilosophyVisible] = useState(false);
  const isTouchDevice = useRef(false);

  const result = useMemo(() => calculateSteadyScore(data), [data]);

  if (!result) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
          {t("title")}
        </p>
        <p className="text-sm text-slate-500">{t("notEnough")}</p>
      </div>
    );
  }

  const colors = scoreColors(result.score);
  const showBreakdown = breakdownOpen || breakdownHovered;
  const labelKey = result.labelKey as ScoreLabelKey;

  function handleTouchStart() {
    isTouchDevice.current = true;
  }

  function handleCardMouseEnter() {
    if (!isTouchDevice.current) setBreakdownHovered(true);
  }

  function handleCardMouseLeave() {
    if (!isTouchDevice.current) setBreakdownHovered(false);
  }

  function handleCardClick() {
    setBreakdownOpen((o) => !o);
  }

  function handleLabelMouseEnter() {
    if (!isTouchDevice.current) setPhilosophyVisible(true);
  }

  function handleLabelMouseLeave() {
    if (!isTouchDevice.current) setPhilosophyVisible(false);
  }

  return (
    <div
      className={`rounded-xl border bg-slate-900 overflow-hidden flex flex-col ${colors.card}`}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      {/* ── Main content (click = toggle breakdown) ── */}
      <button
        type="button"
        className="flex-1 px-5 py-4 text-left w-full"
        onClick={handleCardClick}
        aria-expanded={showBreakdown}
      >
        {/* Title */}
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
          {t("title")}
        </p>

        {/* Score number */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className={`text-5xl font-mono font-bold leading-none ${colors.text}`}>
            {result.score}
          </span>
          <span className="text-slate-500 text-lg font-mono">/100</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        {/* ── Qualitative label + philosophy tooltip ── */}
        <div
          onMouseEnter={handleLabelMouseEnter}
          onMouseLeave={handleLabelMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <p className={`text-sm font-semibold cursor-help ${colors.text}`}>
            {t(`labels.${labelKey}` as Parameters<typeof t>[0])}
            <span className="ml-1 text-slate-600 text-xs select-none">ⓘ</span>
          </p>

          {philosophyVisible && (
            <div
              className={`mt-2 rounded-lg border px-3 py-2 text-xs text-slate-400 leading-relaxed ${colors.philosophyBg}`}
            >
              {t("philosophy")}
            </div>
          )}
        </div>

        {/* Based on */}
        <p className="text-xs text-slate-500 mt-1">
          {daysBack !== null
            ? t("basedOnPeriod", { trades: data.tradeCount, days: daysBack })
            : t("basedOnAll", { trades: data.tradeCount })}
        </p>
      </button>

      {/* ── Breakdown panel ── */}
      {showBreakdown && (
        <div className="border-t border-slate-800 px-5 py-4 space-y-2.5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
            {t("breakdown")}
          </p>
          {result.signals.map((sig) => (
            <SignalRow key={sig.key} signal={sig} barColor={colors.bar} t={t} />
          ))}
          <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-mono">
            <span className="text-slate-500">{t("total")}</span>
            <span className={`font-bold ${colors.text}`}>{result.score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
