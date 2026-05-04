"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("RebuildPage");

  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.error ?? t("error"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("networkError"));
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
      <div className="text-center space-y-6 max-w-lg w-full">
        <div className="text-5xl font-bold tracking-tight">Steady</div>

        <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>

        <p className="text-slate-500 text-base">{t("subtitle")}</p>

        <div className="pt-2">
          {!showInput && status !== "success" && (
            <button
              onClick={() => setShowInput(true)}
              className="text-sm text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-200 px-5 py-2 rounded-full transition-colors"
            >
              {t("cta")}
            </button>
          )}

          {showInput && status !== "success" && (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-slate-500 w-64"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="text-sm text-slate-900 bg-slate-200 hover:bg-white px-5 py-2 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === "loading" ? "…" : t("submit")}
              </button>
            </form>
          )}

          {status === "success" && (
            <p className="text-sm text-slate-400">{t("successMessage")}</p>
          )}

          {status === "error" && (
            <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
