"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Choice = "clean" | "not_clean";

type VerdictData = {
  durationSeconds: number;
  total: number;
  clean: number;
  notClean: number;
  cleanPct: number;
  insightKey: "solid" | "mixed" | "tough" | "empty";
  longestNotCleanStreak: number;
};

interface Props {
  sessionId: string;
  userId: string;
  startedAt: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function computeStats(triggers: { choice: Choice }[]) {
  const total = triggers.length;
  const cleanCount = triggers.filter((t) => t.choice === "clean").length;
  const notCleanCount = total - cleanCount;
  const cleanPct = total > 0 ? Math.round((cleanCount / total) * 100) : 0;

  let currentStreakType: Choice | null = null;
  let currentStreakCount = 0;
  if (total > 0) {
    currentStreakType = triggers[total - 1].choice;
    for (let i = total - 1; i >= 0; i--) {
      if (triggers[i].choice === currentStreakType) currentStreakCount++;
      else break;
    }
  }

  let longestNotCleanStreak = 0;
  let runNc = 0;
  for (const t of triggers) {
    if (t.choice === "not_clean") {
      runNc++;
      if (runNc > longestNotCleanStreak) longestNotCleanStreak = runNc;
    } else {
      runNc = 0;
    }
  }

  return { total, cleanCount, notCleanCount, cleanPct, currentStreakType, currentStreakCount, longestNotCleanStreak };
}

export default function SessionTriggerScreen({ sessionId, userId, startedAt }: Props) {
  const tt = useTranslations("TriggerPage");
  const ts = useTranslations("SessionPage");
  const tv = useTranslations("VerdictModal");
  const tm = useTranslations("LiveMirror");
  const locale = useLocale();
  const router = useRouter();

  const [triggers, setTriggers] = useState<{ choice: Choice }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState<Choice | null>(null);
  const [ending, setEnding] = useState(false);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [notCleanToday, setNotCleanToday] = useState(0);

  // Load existing triggers for this session (handles page refresh)
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from("triggers")
      .select("choice")
      .eq("session_id", sessionId)
      .then(({ data }) => {
        if (data) setTriggers(data as { choice: Choice }[]);
      });
  }, [sessionId]);

  // Fetch today's Not Clean count across all sessions (once on mount)
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("triggers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("choice", "not_clean")
      .gte("created_at", todayStart.toISOString())
      .then(({ count }) => {
        setNotCleanToday(count ?? 0);
      });
  }, [userId]);

  // Elapsed timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const logTrigger = useCallback(
    (choice: Choice) => {
      setFlash(choice);
      setTriggers((prev) => [...prev, { choice }]);
      if (choice === "not_clean") setNotCleanToday((n) => n + 1);
      setTimeout(() => setFlash(null), 200);

      const supabase = createSupabaseBrowser();
      supabase
        .from("triggers")
        .insert({ choice, user_id: userId, session_id: sessionId })
        .then(({ error }) => {
          if (error) console.error("[trigger] insert failed:", error.message);
        });
    },
    [userId, sessionId]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (verdict) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "c") logTrigger("clean");
      if (e.key.toLowerCase() === "n") logTrigger("not_clean");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logTrigger, verdict]);

  async function handleEndSession() {
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch("/api/sessions/end", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const { longestNotCleanStreak } = computeStats(triggers);
        setVerdict({ ...data, longestNotCleanStreak });
      }
    } catch (e) {
      console.error("[session] end failed:", e);
    } finally {
      setEnding(false);
    }
  }

  function handleBackToDashboard() {
    router.push(locale === "fr" ? "/fr" : "/");
    router.refresh();
  }

  const stats = useMemo(() => computeStats(triggers), [triggers]);
  const { total, cleanPct, currentStreakType, currentStreakCount, longestNotCleanStreak } = stats;

  const statsLabel =
    total > 0
      ? ts("stats", { total, pct: cleanPct, duration: formatDuration(elapsed) })
      : formatDuration(elapsed);

  // Live Mirror derived values
  const notCleanStreak = currentStreakType === "not_clean" ? currentStreakCount : 0;
  type MirrorCondition = "A" | "B" | "C" | "default";
  const condition: MirrorCondition =
    notCleanStreak >= 4 ? "A" :
    notCleanStreak === 3 ? "B" :
    notCleanStreak === 2 ? "C" :
    "default";

  const panelBg =
    condition === "A" ? "bg-[#1a0505]" :
    condition === "B" ? "bg-[#1a0a0a]" :
    condition === "C" ? "bg-[#1a1505]" :
    "bg-[#0a0a0a]";

  const ratioColor =
    total < 3 ? "text-slate-500" :
    cleanPct >= 70 ? "text-emerald-400" :
    cleanPct >= 50 ? "text-amber-400" :
    "text-red-400";

  const streakTypeLabel =
    currentStreakType === "clean" ? tm("streakLabelClean") : tm("streakLabelNotClean");

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Session header */}
      <div className="flex items-center justify-between px-6 py-4">
        <p className="font-mono text-sm text-slate-500">{statsLabel}</p>
        <button
          onClick={handleEndSession}
          disabled={ending}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
        >
          {ending ? "…" : ts("endSession")}
        </button>
      </div>

      {/* Trigger buttons */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <div className="flex gap-6">
          <button
            onClick={() => logTrigger("clean")}
            className={`w-[280px] h-[180px] rounded-2xl text-3xl font-bold text-white
              bg-emerald-700 hover:bg-emerald-600 transition-all duration-100
              ${flash === "clean" ? "scale-105 brightness-150" : "scale-100 brightness-100"}`}
          >
            {tt("clean")}
          </button>
          <button
            onClick={() => logTrigger("not_clean")}
            className={`w-[280px] h-[180px] rounded-2xl text-3xl font-bold text-white
              bg-red-800 hover:bg-red-700 transition-all duration-100
              ${flash === "not_clean" ? "scale-105 brightness-150" : "scale-100 brightness-100"}`}
          >
            {tt("notClean")}
          </button>
        </div>
        <p className="text-xs text-slate-700 font-mono tracking-wide">{tt("shortcuts")}</p>
      </div>

      {/* Live Mirror panel */}
      <div
        className={`w-full h-20 flex items-center px-6 border-t border-slate-900 transition-colors duration-300 ${panelBg}`}
      >
        {/* Left: trigger count */}
        <div className="w-32 shrink-0">
          <p className="text-xs text-slate-500 font-mono">
            {tm("triggersCount", { n: total })}
          </p>
        </div>

        {/* Center: contextual message or ratio */}
        <div className="flex-1 text-center">
          {condition === "A" && (
            <p className="text-xs text-red-400 font-mono">
              {tm("condA", { n: notCleanStreak, longest: longestNotCleanStreak })}
            </p>
          )}
          {condition === "B" && (
            <p className="text-xs text-red-400 font-mono">
              {tm("condB", { pct: 100 - cleanPct })}
            </p>
          )}
          {condition === "C" && (
            <p className="text-xs text-amber-400 font-mono">
              {tm("condC", { n: notCleanToday })}
            </p>
          )}
          {condition === "default" && (
            <p className={`text-sm font-semibold ${ratioColor}`}>
              {total >= 3 ? tm("ratioPct", { pct: cleanPct }) : tm("noData")}
            </p>
          )}
        </div>

        {/* Right: streak */}
        <div className="w-40 shrink-0 text-right">
          <p className="text-xs text-slate-500 font-mono">
            {total > 0
              ? tm("streakLabel", { type: streakTypeLabel, n: currentStreakCount })
              : tm("streakNone")}
          </p>
        </div>
      </div>

      {/* Verdict modal */}
      {verdict && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-950 border border-slate-800 rounded-2xl p-8 max-w-sm w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">{tv("title")}</h2>
              <p className="text-slate-500 font-mono text-sm">
                {formatDuration(verdict.durationSeconds)}
              </p>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("total")}</span>
                <span className="font-semibold">{verdict.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">{tv("clean")}</span>
                <span className="font-semibold text-emerald-400">
                  {verdict.clean} ({verdict.cleanPct}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">{tv("notClean")}</span>
                <span className="font-semibold text-red-400">
                  {verdict.notClean} ({verdict.total > 0 ? 100 - verdict.cleanPct : 0}%)
                </span>
              </div>
              {verdict.longestNotCleanStreak >= 2 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{tv("longestNotCleanStreakLabel")}</span>
                  <span className="font-semibold text-red-400">{verdict.longestNotCleanStreak}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-xl px-4 py-3 text-sm text-slate-300 border-t border-slate-800">
              {verdict.insightKey === "solid" && tv("insightSolid")}
              {verdict.insightKey === "mixed" && tv("insightMixed", { n: verdict.notClean })}
              {verdict.insightKey === "tough" && tv("insightTough")}
              {verdict.insightKey === "empty" && tv("insightEmpty")}
            </div>

            <button
              onClick={handleBackToDashboard}
              className="w-full bg-slate-200 hover:bg-white text-slate-900 font-semibold rounded-lg py-3 text-sm transition-colors"
            >
              {tv("backToDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
