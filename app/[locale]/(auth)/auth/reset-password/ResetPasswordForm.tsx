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

export default function ResetPasswordForm() {
  const t = useTranslations("AuthPage");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  function tErr(key: AuthErrorKey): string {
    return t(key as Parameters<typeof t>[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("errors.passwordTooShort"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        devLog("updateUser", err);
        setError(tErr(mapAuthError(err as AuthError)));
      } else {
        setDone(true);
        setTimeout(() => router.push(locale === "fr" ? "/fr/auth" : "/auth"), 2000);
      }
    } catch (e) {
      devLog("updateUser", e);
      setError(tErr("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <span className="text-3xl">✓</span>
          <p className="text-slate-200 font-medium">{t("passwordUpdated")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <p className="text-2xl font-bold tracking-tight">Steady</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h1 className="text-slate-200 font-semibold">{t("newPasswordLabel")}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white border-transparent h-10"
          >
            {loading ? t("loading") : t("updatePassword")}
          </Button>
        </form>
      </div>
    </div>
  );
}
