"use client";

import { useState, FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileType = "scalper" | "intraday" | "swing" | "position" | "mixed";

const PROFILES: { type: ProfileType; emoji: string; labelKey: string; descKey: string }[] = [
  { type: "scalper",  emoji: "⚡", labelKey: "scalperLabel",  descKey: "scalperDesc"  },
  { type: "intraday", emoji: "🌗", labelKey: "intradayLabel", descKey: "intradayDesc" },
  { type: "swing",    emoji: "🌊", labelKey: "swingLabel",    descKey: "swingDesc"    },
  { type: "position", emoji: "⛰️", labelKey: "positionLabel", descKey: "positionDesc" },
  { type: "mixed",    emoji: "🤷", labelKey: "mixedLabel",    descKey: "mixedDesc"    },
];

function isValidAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

interface Props {
  username: string | null;
}

export default function OnboardingFlow({ username }: Props) {
  const t = useTranslations("OnboardingPage");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [profileType, setProfileType] = useState<ProfileType>("mixed");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLabel, setWalletLabel]   = useState("");
  const [walletError, setWalletError]   = useState<string | null>(null);
  const [addedWallet, setAddedWallet]   = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);

  const homeHref = locale === "fr" ? "/fr" : "/";

  async function saveAndRedirect(wallet: string | null) {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { router.push(locale === "fr" ? "/fr/auth" : "/auth"); return; }

      await supabase
        .from("user_profiles")
        .update({ profile_type: profileType, onboarded_at: new Date().toISOString() })
        .eq("id", user.id);

      if (wallet) {
        router.push(locale === "fr" ? `/fr/trader/${wallet}` : `/trader/${wallet}`);
      } else {
        router.push(homeHref);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    await saveAndRedirect(null);
  }

  async function handleStep2Next(e: FormEvent) {
    e.preventDefault();
    setWalletError(null);

    const addr = walletAddress.trim();
    if (!isValidAddress(addr)) {
      setWalletError(t("invalidAddress"));
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("user_wallets").insert({
        user_id: user.id,
        address: addr.toLowerCase(),
        label: walletLabel.trim() || "Main wallet",
        is_primary: true,
      });

      if (error) {
        setWalletError(t("invalidAddress"));
        return;
      }
      setAddedWallet(addr.toLowerCase());
      setStep(3);
    } finally {
      setSaving(false);
    }
  }

  const displayName = username ?? t("fallbackName");
  const profileLabel = t(`profiles.${profileType}` as Parameters<typeof t>[0]);

  return (
    <div className="space-y-8">
      {/* Top bar: progress + skip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? "w-6 bg-teal-400" : "w-3 bg-slate-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {t("stepOf", { step, total: 3 })}
          </span>
        </div>
        {step < 3 && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
          >
            {t("skipOnboarding")}
          </button>
        )}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-100">{t("step1Title")}</h1>
            <p className="text-sm text-slate-500">{t("step1Subtitle")}</p>
          </div>

          <div className="space-y-2">
            {PROFILES.map(({ type, emoji, labelKey, descKey }) => (
              <button
                key={type}
                type="button"
                onClick={() => setProfileType(type)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                  profileType === type
                    ? "border-teal-400 bg-teal-400/5 text-slate-100"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300"
                }`}
              >
                <span className="text-xl shrink-0">{emoji}</span>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-sm">
                    {t(labelKey as Parameters<typeof t>[0])}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t(descKey as Parameters<typeof t>[0])}
                  </p>
                </div>
                <div
                  className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                    profileType === type
                      ? "border-teal-400 bg-teal-400"
                      : "border-slate-700"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              className="bg-teal-500 hover:bg-teal-600 text-white border-transparent px-6"
            >
              {t("next")} →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-100">{t("step2Title")}</h1>
            <p className="text-sm text-slate-500">{t("step2Subtitle")}</p>
          </div>

          <form onSubmit={handleStep2Next} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">
                {t("addressLabel")}
              </label>
              <Input
                type="text"
                value={walletAddress}
                onChange={(e) => { setWalletAddress(e.target.value); setWalletError(null); }}
                placeholder={t("addressPlaceholder")}
                spellCheck={false}
                autoComplete="off"
                className="font-mono bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">
                {t("labelLabel")}
              </label>
              <Input
                type="text"
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                placeholder={t("labelPlaceholder")}
                maxLength={50}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
              />
            </div>

            {walletError && (
              <p className="text-sm text-red-400">{walletError}</p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← {t("back")}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={saving}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                >
                  {t("skipWallet")}
                </button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-teal-500 hover:bg-teal-600 text-white border-transparent px-6"
                >
                  {saving ? t("saving") : `${t("next")} →`}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div className="space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-100">
              {username ? t("step3TitleUser", { name: displayName }) : t("step3TitleGeneric")}
            </h1>
            <p className="text-slate-400">
              {t("step3Subtitle", { profile: profileLabel })}
            </p>
            {addedWallet && (
              <p className="text-xs text-slate-600 font-mono mt-1">{addedWallet}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={() => saveAndRedirect(addedWallet)}
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-600 text-white border-transparent px-8 h-10"
            >
              {saving ? t("saving") : t("startAnalyzing")}
            </Button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              ← {t("back")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
