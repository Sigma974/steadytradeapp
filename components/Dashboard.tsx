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
  hasWallet: boolean;
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

export default function Dashboard({ activeSession, pastSessions, hasWallet }: Props) {
  const t = useTranslations("Dashboard");
  const tp = useTranslations("PreSessionModal");
  const locale = useLocale();

  const [agoText, setAgoText] = useState(() =>
    activeSession ? computeAgo(activeSession.started_at) : ""
  );
  const [showModal, setShowModal] = useState(false);
  const [modalStarting, setModalStarting] = useState<"clean" | "not_clean" | null>(null);

  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(
      () => setAgoText(computeAgo(activeSession.started_at)),
      60_000
    );
    return () => clearInterval(id);
  }, [activeSession]);

  const sessionHref = locale === "fr" ? "/fr/session" : "/session";
  const settingsHref = locale === "fr" ? "/fr/settings" : "/settings";

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = locale === "fr" ? "/fr" : "/";
  }

  async function handlePreSessionChoice(choice: "clean" | "not_clean") {
    setModalStarting(choice);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      if (res.ok || res.status === 409) {
        window.location.href = sessionHref;
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("[session] start failed:", res.status, json);
        setModalStarting(null);
      }
    } catch (e) {
      console.error("[session] start failed:", e);
      setModalStarting(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
        <span className="text-lg font-bold tracking-tight">Steady</span>
        <div className="flex items-center gap-4">
          <a
            href={settingsHref}
            className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
          >
            {t("settings")}
          </a>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
          >
            {t("signOut")}
          </button>
        </div>
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
              onClick={() => setShowModal(true)}
              className="w-full max-w-xs py-5 rounded-2xl text-xl font-bold bg-emerald-700 hover:bg-emerald-600 transition-colors text-white"
            >
              {t("newSession")}
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

      {/* Pre-session modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-zinc-950 border border-slate-800 rounded-2xl p-8 max-w-sm w-full space-y-6">
            {!hasWallet ? (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold">{tp("noWalletTitle")}</h2>
                  <p className="text-sm text-slate-500">{tp("noWalletText")}</p>
                </div>
                <a
                  href={settingsHref}
                  className="block w-full text-center py-3 rounded-xl bg-slate-200 hover:bg-white text-slate-900 font-semibold text-sm transition-colors"
                >
                  {tp("noWalletCta")}
                </a>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {tp("cancel")}
                </button>
              </>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">{tp("title")}</h2>
                  <p className="text-sm text-slate-500">{tp("subtitle")}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => handlePreSessionChoice("clean")}
                    disabled={modalStarting !== null}
                    className="flex-1 py-8 rounded-2xl text-xl font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition-colors disabled:opacity-60"
                  >
                    {modalStarting === "clean" ? "…" : tp("clean")}
                  </button>
                  <button
                    onClick={() => handlePreSessionChoice("not_clean")}
                    disabled={modalStarting !== null}
                    className="flex-1 py-8 rounded-2xl text-xl font-bold text-white bg-red-800 hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {modalStarting === "not_clean" ? "…" : tp("notClean")}
                  </button>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {tp("cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
