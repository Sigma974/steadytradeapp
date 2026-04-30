"use client";

import { useState, FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { mapAuthError, devLog } from "@/lib/auth-errors";
import type { AuthErrorKey } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "signup" | "signin";
type Mode = Tab | "forgot";

interface Props {
  initialTab: Tab;
  callbackError?: string;
}

export default function AuthForm({ initialTab, callbackError }: Props) {
  const t = useTranslations("AuthPage");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [tab, setTab]         = useState<Tab>(initialTab);
  const [mode, setMode]       = useState<Mode>(initialTab);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(
    callbackError ? t("errors.callbackFailed") : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function reset() {
    setError(null);
    setSuccessMsg(null);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setMode(next);
    reset();
  }

  function validate(): string | null {
    if (!email.trim()) return t("errors.emailRequired");
    if (mode !== "forgot") {
      if (!password)            return t("errors.passwordRequired");
      if (password.length < 8)  return t("errors.passwordTooShort");
    }
    return null;
  }

  function tErr(key: AuthErrorKey): string {
    return t(key as Parameters<typeof t>[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const vErr = validate();
    if (vErr) { setError(vErr); return; }

    reset();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

        if (err) {
          devLog("signUp", err);
          setError(tErr(mapAuthError(err as AuthError)));
        } else if (!data.user || data.user.identities?.length === 0) {
          // Supabase silently returns success for existing emails to prevent enumeration
          setError(tErr("errors.emailAlreadyUsed"));
        } else {
          setSuccessMsg(t("checkInbox"));
        }

      } else if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });

        if (err) {
          devLog("signIn", err);
          setError(tErr(mapAuthError(err as AuthError)));
        } else {
          router.push(locale === "fr" ? "/fr" : "/");
          router.refresh();
        }

      } else {
        // forgot password
        const localePath = locale === "fr" ? "/fr" : "";
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${localePath}/auth/reset-password`,
        });

        if (err) {
          devLog("resetPassword", err);
          setError(tErr(mapAuthError(err as AuthError)));
        } else {
          setSuccessMsg(t("resetSent"));
        }
      }
    } catch (e) {
      devLog("submit", e);
      setError(tErr("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  // ── Success screens ───────────────────────────────────────

  if (successMsg) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <span className="text-3xl">✉️</span>
          <p className="text-slate-200 font-medium leading-relaxed">{successMsg}</p>
          {mode === "forgot" || tab === "signin" ? (
            <button
              onClick={() => { setMode("signin"); setTab("signin"); reset(); }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              {t("backToSignIn")}
            </button>
          ) : (
            <p className="text-slate-500 text-sm">{email}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <p className="text-2xl font-bold tracking-tight">Steady</p>
        <p className="text-slate-500 text-sm">Hyperliquid analytics</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        {mode !== "forgot" && (
          <div className="flex border-b border-slate-800">
            {(["signup", "signin"] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => switchTab(tabKey)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === tabKey
                    ? "text-slate-100 border-b-2 border-teal-400 -mb-px"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tabKey === "signup" ? t("signUp") : t("signIn")}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" && (
          <div className="px-6 pt-5">
            <button
              type="button"
              onClick={() => { setMode("signin"); setTab("signin"); reset(); }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("backToSignIn")}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 block">{t("email")}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">{t("password")}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white border-transparent h-10"
          >
            {loading
              ? t("loading")
              : mode === "forgot"
              ? t("sendReset")
              : t("continueBtn")}
          </Button>

          {mode === "signin" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode("forgot"); reset(); }}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t("forgotPassword")}
              </button>
            </div>
          )}
        </form>

        {mode !== "forgot" && (
          <div className="border-t border-slate-800 px-6 py-4 text-center text-sm text-slate-500">
            {tab === "signup" ? (
              <>
                {t("alreadyHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
                >
                  {t("signIn")}
                </button>
              </>
            ) : (
              <>
                {t("noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
                >
                  {t("signUp")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
