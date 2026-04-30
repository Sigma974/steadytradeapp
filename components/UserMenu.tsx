"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface AuthState {
  email: string;
  username?: string;
}

export default function UserMenu() {
  const t = useTranslations("SettingsPage");
  const locale = useLocale();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // undefined = loading, null = not logged in, {...} = logged in
  const [auth, setAuth] = useState<AuthState | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuth(null); return; }
      supabase
        .from("user_profiles")
        .select("username")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setAuth({ email: user.email!, username: data?.username ?? undefined });
        });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setAuth(null); setOpen(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setAuth(null);
    setOpen(false);
    router.push(locale === "fr" ? "/fr" : "/");
    router.refresh();
  }

  const p = locale === "fr" ? "/fr" : "";

  // Loading — blank placeholder to prevent layout shift
  if (auth === undefined) {
    return <div className="w-16 h-6" />;
  }

  // Not logged in
  if (!auth) {
    return (
      <Link
        href={`${p}/auth`}
        className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
      >
        {t("signIn")}
      </Link>
    );
  }

  // Logged in — avatar + dropdown
  const initial = (auth.username?.[0] ?? auth.email[0]).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-bold flex items-center justify-center hover:bg-teal-500/30 transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs text-slate-500 truncate">{auth.email}</p>
          </div>
          <Link
            href={`${p}/settings?tab=wallets`}
            onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            {t("myWallets")}
          </Link>
          <Link
            href={`${p}/settings`}
            onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            {t("settingsLink")}
          </Link>
          <div className="border-t border-slate-800 mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left flex items-center px-3 py-2 text-sm text-red-400 hover:bg-slate-800 transition-colors"
            >
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
