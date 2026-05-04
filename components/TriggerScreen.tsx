"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Choice = "clean" | "not_clean";

interface Props { userId: string }

export default function TriggerScreen({ userId }: Props) {
  const t = useTranslations("TriggerPage");
  const locale = useLocale();
  const router = useRouter();

  const [todayCount, setTodayCount] = useState(0);
  const [flash, setFlash] = useState<Choice | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("triggers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .then(({ count }) => {
        if (count !== null) setTodayCount(count);
      });
  }, []);

  const logTrigger = useCallback((choice: Choice) => {
    // Optimistic — flash immediately, never block on DB response
    setFlash(choice);
    setTodayCount((c) => c + 1);
    setTimeout(() => setFlash(null), 200);

    const supabase = createSupabaseBrowser();
    supabase
      .from("triggers")
      .insert({ choice, user_id: userId })
      .then(({ error }) => {
        if (error) console.error("[trigger] insert failed:", error.message);
      });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "c") logTrigger("clean");
      if (e.key.toLowerCase() === "n") logTrigger("not_clean");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logTrigger]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push(locale === "fr" ? "/fr" : "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
        >
          {t("signOut")}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <h1 className="text-xl font-medium text-slate-400">{t("question")}</h1>

        <div className="flex gap-6">
          <button
            onClick={() => logTrigger("clean")}
            className={`w-[280px] h-[180px] rounded-2xl text-3xl font-bold text-white
              bg-emerald-700 hover:bg-emerald-600 transition-all duration-100
              ${flash === "clean" ? "scale-105 brightness-150" : "scale-100 brightness-100"}`}
          >
            {t("clean")}
          </button>

          <button
            onClick={() => logTrigger("not_clean")}
            className={`w-[280px] h-[180px] rounded-2xl text-3xl font-bold text-white
              bg-red-800 hover:bg-red-700 transition-all duration-100
              ${flash === "not_clean" ? "scale-105 brightness-150" : "scale-100 brightness-100"}`}
          >
            {t("notClean")}
          </button>
        </div>

        <p className="text-xs text-slate-700 font-mono tracking-wide">{t("shortcuts")}</p>
      </div>

      <div className="pb-8 text-center">
        <p className="text-xs text-slate-700">{t("todayCount", { count: todayCount })}</p>
      </div>
    </div>
  );
}
