"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface Props {
  currentAddress: string | null;
  locale: string;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletSettings({ currentAddress, locale }: Props) {
  const t = useTranslations("Settings");

  const [address, setAddress] = useState(currentAddress ?? "");
  const [editing, setEditing] = useState(!currentAddress);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardHref = locale === "fr" ? "/fr" : "/";

  async function handleSave() {
    setError(null);
    if (!ADDRESS_RE.test(address)) {
      setError(t("invalidAddress"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(t("saveError"));
      }
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
        <span className="text-lg font-bold tracking-tight">{t("title")}</span>
        <a
          href={dashboardHref}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          {t("backToDashboard")}
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-16 px-4 max-w-md mx-auto w-full gap-8">
        {/* Wallet section */}
        <div className="w-full space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            {t("walletSection")}
          </h2>

          {!editing && currentAddress ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950 border border-slate-800">
              <span className="font-mono text-sm text-slate-300">
                {shortenAddress(currentAddress)}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t("change")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">{t("noWalletHint")}</p>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setError(null); setSaved(false); }}
                placeholder={t("addressPlaceholder")}
                className="w-full bg-zinc-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-slate-700 focus:outline-none focus:border-slate-600"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-slate-200 hover:bg-white text-slate-900 font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {saved && (
            <p className="text-xs text-emerald-400">{t("saved")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
