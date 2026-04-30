"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function ProfileHintBanner() {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_profiles")
        .select("profile_type, onboarded_at")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile) return;
          const isRecent =
            !profile.onboarded_at ||
            Date.now() - new Date(profile.onboarded_at).getTime() <
              7 * 24 * 60 * 60 * 1000;
          if (isRecent && (!profile.profile_type || profile.profile_type === "mixed")) {
            setShow(true);
          }
        });
    });
  }, []);

  if (!show) return null;

  const settingsHref = locale === "fr" ? "/fr/settings" : "/settings";

  return (
    <div className="flex items-center justify-between gap-3 text-xs bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5">
      <span className="text-slate-400 leading-relaxed">
        {t.rich("profileHint", {
          link: (chunks) => (
            <Link
              href={settingsHref}
              className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
            >
              {chunks}
            </Link>
          ),
        })}
      </span>
      <button
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
