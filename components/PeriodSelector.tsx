"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PERIODS, DEFAULT_DAYS, daysToKey, type PeriodChange, type PeriodKey } from "@/lib/periods";

interface Props {
  daysBack: number | null;
  startTime?: number;
  endTime?: number;
  onChange: (v: PeriodChange) => void;
  disabled?: boolean;
}

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const MIN_DATE = "2022-01-01";

export default function PeriodSelector({ daysBack, startTime, endTime, onChange, disabled }: Props) {
  const t = useTranslations("Period");
  const activeKey: PeriodKey = daysToKey(daysBack);

  const [customMode, setCustomMode] = useState(() => activeKey === "custom");
  // Captures the last predefined period so Cancel can restore it
  const [prevDays, setPrevDays] = useState<number>(() =>
    activeKey !== "custom" ? (daysBack ?? DEFAULT_DAYS) : DEFAULT_DAYS
  );
  const showCustomForm = customMode || activeKey === "custom";

  const [start, setStart] = useState(() => startTime ? toDateStr(startTime) : "");
  const [end, setEnd] = useState(() => endTime ? toDateStr(endTime) : "");
  const [dateError, setDateError] = useState("");

  function enterCustomMode() {
    if (daysBack !== null) setPrevDays(daysBack);
    setCustomMode(true);
  }

  function handleCancel() {
    setCustomMode(false);
    setStart(""); setEnd(""); setDateError("");
    onChange({ daysBack: prevDays });
  }

  function handlePredefined(days: number) {
    if (disabled) return;
    setCustomMode(false);
    setStart(""); setEnd(""); setDateError("");
    onChange({ daysBack: days });
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (disabled) return;
    const val = e.target.value as PeriodKey;
    if (val === "custom") {
      enterCustomMode();
      return;
    }
    setCustomMode(false);
    const found = PERIODS.find((p) => p.key === val);
    if (found) {
      setStart(""); setEnd(""); setDateError("");
      onChange({ daysBack: found.daysBack });
    }
  }

  function handleApplyCustom() {
    if (!start || !end) { setDateError(t("errorBothDates")); return; }
    if (end < start) { setDateError(t("errorEndBeforeStart")); return; }
    const startMs = new Date(start + "T00:00:00Z").getTime();
    const endMs = new Date(end + "T23:59:59Z").getTime();
    setDateError("");
    onChange({ startTime: startMs, endTime: endMs });
  }

  const today = todayStr();
  const minDate = MIN_DATE;

  const pillBase = "text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap";
  const pillActive = "bg-slate-700 border-slate-500 text-slate-100";
  const pillInactive = "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600";
  const pillDisabled = "opacity-40 cursor-not-allowed";

  // Mobile: native select
  const selectValue = (customMode || activeKey === "custom") ? "custom" : (activeKey as string);

  return (
    <div className="space-y-2">
      {/* Mobile select */}
      <select
        className="sm:hidden h-8 rounded-md border border-slate-700 bg-slate-900 text-slate-100 text-xs px-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500"
        value={selectValue}
        onChange={handleSelectChange}
        disabled={disabled}
      >
        {PERIODS.map((p) => (
          <option key={p.key} value={p.key}>{t(p.key)}</option>
        ))}
        <option value="custom">{t("custom")}</option>
      </select>

      {/* Desktop pills */}
      <div className="hidden sm:flex flex-wrap gap-1 items-center">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => handlePredefined(p.daysBack)}
            disabled={disabled}
            className={`${pillBase} ${activeKey === p.key ? pillActive : pillInactive} ${disabled ? pillDisabled : ""}`}
          >
            {t(p.key)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { if (!disabled) enterCustomMode(); }}
          disabled={disabled}
          className={`${pillBase} ${customMode || activeKey === "custom" ? pillActive : pillInactive} ${disabled ? pillDisabled : ""}`}
        >
          {t("custom")}
        </button>
      </div>

      {/* Custom date range form */}
      {showCustomForm && (
        <div className="flex flex-wrap gap-2 items-end pt-1">
          <div className="space-y-0.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">{t("from")}</label>
            <input
              type="date"
              value={start}
              min={minDate}
              max={end || today}
              onChange={(e) => { setStart(e.target.value); setDateError(""); }}
              className="h-8 rounded-md border border-slate-700 bg-slate-900 text-slate-100 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-slate-500"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">{t("to")}</label>
            <input
              type="date"
              value={end}
              min={start || minDate}
              max={today}
              onChange={(e) => { setEnd(e.target.value); setDateError(""); }}
              className="h-8 rounded-md border border-slate-700 bg-slate-900 text-slate-100 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-slate-500"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!start || !end}
            className="h-8 px-3 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("apply")}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="h-8 px-3 rounded-md border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          >
            {t("cancel")}
          </button>
          {dateError && <p className="text-xs text-red-400 w-full">{dateError}</p>}
        </div>
      )}
    </div>
  );
}
