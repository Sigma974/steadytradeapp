"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type SessionSummary = {
  id: string;
  started_at: string;
  ended_at: string;
  total: number;
  clean: number;
};

type ActiveSession = {
  id: string;
  started_at: string;
} | null;

interface Props {
  activeSession: ActiveSession;
  pastSessions: SessionSummary[];
}

function formatDuration(startedAt: string, endedAt: string): string {
  const s = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function computeAgo(startedAt: string): string {
  const diffMin = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard({ activeSession, pastSessions }: Props) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();

  const [starting, setStarting] = useState(false);
  const [agoText, setAgoText] = useState(() =>
    activeSession ? computeAgo(activeSession.started_at) : ""
  );

  // Update "X ago" text every minute
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(
      () => setAgoText(computeAgo(activeSession.started_at)),
      60_000
    );
    return () => clearInterval(id);
  }, [activeSession]);

  const sessionHref = locale === "fr" ? "/fr/session" : "/session";

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = locale === "fr" ? "/fr" : "/";
  }

  async function handleNewSession() {
    setStarting(true);
    try {
      const res = await fetch("/api/sessions/start", { method: "POST" });
      if (res.ok || res.status === 409) {
        // Hard navigation — bypasses Next.js Router Cache which would replay
        // the stale redirect from /session → / (no active session at load time).
        window.location.href = sessionHref;
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("[session] start failed:", res.status, json);
        setStarting(false);
      }
    } catch (e) {
      console.error("[session] start failed:", e);
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
        <span className="text-lg font-bold tracking-tight">Steady</span>
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
        >
          {t("signOut")}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-start pt-16 px-4 gap-12 max-w-xl mx-auto w-full">

        {/* CTA */}
        <div className="w-full flex flex-col items-center gap-2">
          {activeSession ? (
            <>
              <button
                onClick={() => { window.location.href = sessionHref; }}
                className="w-full max-w-xs py-5 rounded-2xl text-xl font-bold bg-amber-600 hover:bg-amber-500 transition-colors text-white"
              >
                {t("resumeSession")}
              </button>
              <p className="text-xs text-slate-600">
                {t("startedAgo", { time: agoText })}
              </p>
            </>
          ) : (
            <button
              onClick={handleNewSession}
              disabled={starting}
              className="w-full max-w-xs py-5 rounded-2xl text-xl font-bold bg-emerald-700 hover:bg-emerald-600 transition-colors text-white disabled:opacity-60"
            >
              {starting ? "…" : t("newSession")}
            </button>
          )}
        </div>

        {/* Session list */}
        <div className="w-full">
          {pastSessions.length === 0 ? (
            <p className="text-center text-slate-700 text-sm">{t("noSessions")}</p>
          ) : (
            <div className="space-y-2">
              {pastSessions.map((s) => {
                const cleanPct = s.total > 0 ? Math.round((s.clean / s.total) * 100) : null;
                const ratioColor =
                  cleanPct === null
                    ? "text-slate-600"
                    : cleanPct >= 70
                      ? "text-emerald-400"
                      : cleanPct >= 50
                        ? "text-amber-400"
                        : "text-red-400";

                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950 border border-slate-900"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm text-slate-300">{formatDate(s.started_at)}</p>
                      <p className="text-xs text-slate-600">
                        {formatDuration(s.started_at, s.ended_at)} · {s.total} {t("triggers")}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${ratioColor}`}>
                      {cleanPct !== null ? `${cleanPct}% ${t("clean")}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
