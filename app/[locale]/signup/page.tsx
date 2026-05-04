"use client";

import { useState, FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const t = useTranslations("SignUp");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signinHref = locale === "fr" ? "/fr/signin" : "/signin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(t("errorGeneric"));
      } else if (!data.user || data.user.identities?.length === 0) {
        // Supabase returns success for existing emails — detect via empty identities
        setError(t("errorEmailUsed"));
      } else {
        // If email confirmation is disabled in Supabase, session is set immediately
        router.push(locale === "fr" ? "/fr" : "/");
        router.refresh();
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight text-white">Steady</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-slate-600"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-slate-600"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-200 hover:bg-white text-slate-900 font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? t("loading") : t("submit")}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600">
          {t("hasAccount")}{" "}
          <Link href={signinHref} className="text-slate-400 hover:text-slate-200 transition-colors">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
