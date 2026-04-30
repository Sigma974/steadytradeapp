"use client";

import { useState, useRef, FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { mapAuthError, devLog } from "@/lib/auth-errors";
import type { AuthError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "wallets" | "subscription" | "account";
type ProfileType = "scalper" | "intraday" | "swing" | "position" | "mixed";

interface Wallet {
  id: string;
  address: string;
  label: string;
  is_primary: boolean;
}

interface Profile {
  username: string | null;
  profile_type: string | null;
  locale: string;
  subscription_tier: string;
  subscription_ends_at: string | null;
  onboarded_at: string | null;
}

interface Props {
  userId: string;
  email: string;
  profile: Profile;
  wallets: Wallet[];
  initialTab: string;
}

type ModalState =
  | { type: "add-wallet" }
  | { type: "edit-wallet"; wallet: Wallet }
  | { type: "remove-wallet"; wallet: Wallet }
  | { type: "change-password" }
  | { type: "delete-account" }
  | null;

const PROFILE_TYPES: { type: ProfileType; emoji: string; labelKey: string }[] = [
  { type: "scalper",  emoji: "⚡", labelKey: "scalperLabel"  },
  { type: "intraday", emoji: "🌗", labelKey: "intradayLabel" },
  { type: "swing",    emoji: "🌊", labelKey: "swingLabel"    },
  { type: "position", emoji: "⛰️", labelKey: "positionLabel" },
  { type: "mixed",    emoji: "🤷", labelKey: "mixedLabel"    },
];

const TABS: Tab[] = ["profile", "wallets", "subscription", "account"];

function isValidAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, ok }: { message: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl transition-all ${
        ok ? "bg-teal-500 text-white" : "bg-red-500/90 text-white"
      }`}
    >
      {message}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsTabs({
  userId,
  email,
  profile: initialProfile,
  wallets: initialWallets,
  initialTab,
}: Props) {
  const t = useTranslations("SettingsPage");
  const tOB = useTranslations("OnboardingPage");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const validTabs = TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "profile";
  const [activeTab, setActiveTab] = useState<Tab>(validTabs);
  const [wallets, setWallets]     = useState<Wallet[]>(initialWallets);
  const [modal, setModal]         = useState<ModalState>(null);
  const [toast, setToast]         = useState<{ message: string; ok: boolean } | null>(null);

  function showToast(message: string, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function closeModal() { setModal(null); }

  // ── Profile tab state ──────────────────────────────────────────────────────

  const [username, setUsername]       = useState(initialProfile.username ?? "");
  const [profileType, setProfileType] = useState<ProfileType>(
    (initialProfile.profile_type as ProfileType) ?? "mixed"
  );
  const [profileLocale, setProfileLocale] = useState(initialProfile.locale ?? "en");
  const [profileSaving, setProfileSaving] = useState(false);

  const profileChanged =
    username !== (initialProfile.username ?? "") ||
    profileType !== ((initialProfile.profile_type as ProfileType) ?? "mixed") ||
    profileLocale !== (initialProfile.locale ?? "en");

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ username: username || null, profile_type: profileType, locale: profileLocale })
        .eq("id", userId);

      if (error) { showToast(t("error"), false); return; }

      showToast(t("profileSaved"));

      if (profileLocale !== locale) {
        const newPath = profileLocale === "fr" ? "/fr/settings" : "/settings";
        document.cookie = `NEXT_LOCALE=${profileLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
        router.push(newPath);
      } else {
        router.refresh();
      }
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Wallet operations ──────────────────────────────────────────────────────

  const [walletAddr, setWalletAddr]   = useState("");
  const [walletLabel, setWalletLabel] = useState("");
  const [walletPrimary, setWalletPrimary] = useState(false);
  const [walletSaving, setWalletSaving]   = useState(false);
  const [walletError, setWalletError]     = useState<string | null>(null);

  function resetWalletForm() {
    setWalletAddr(""); setWalletLabel(""); setWalletPrimary(false); setWalletError(null);
  }

  function openAddWallet() { resetWalletForm(); setModal({ type: "add-wallet" }); }

  function openEditWallet(w: Wallet) {
    setWalletAddr(w.address);
    setWalletLabel(w.label);
    setWalletPrimary(w.is_primary);
    setWalletError(null);
    setModal({ type: "edit-wallet", wallet: w });
  }

  async function handleAddWallet(e: FormEvent) {
    e.preventDefault();
    const addr = walletAddr.trim().toLowerCase();
    if (!isValidAddress(addr)) { setWalletError(t("invalidAddress")); return; }

    setWalletSaving(true);
    try {
      if (walletPrimary) {
        await supabase.from("user_wallets").update({ is_primary: false }).eq("user_id", userId);
      }
      const { data, error } = await supabase.from("user_wallets").insert({
        user_id: userId,
        address: addr,
        label: walletLabel.trim() || "Main wallet",
        is_primary: walletPrimary || wallets.length === 0,
      }).select().single();

      if (error) { setWalletError(t("error")); return; }

      setWallets((prev) =>
        walletPrimary || prev.length === 0
          ? [...prev.map((w) => ({ ...w, is_primary: false })), data]
          : [...prev, data]
      );
      closeModal();
      showToast(t("walletAdded"));
    } finally {
      setWalletSaving(false);
    }
  }

  async function handleEditWallet(e: FormEvent, walletId: string) {
    e.preventDefault();
    setWalletSaving(true);
    try {
      if (walletPrimary) {
        await supabase.from("user_wallets").update({ is_primary: false }).eq("user_id", userId);
        await supabase.from("user_wallets").update({ label: walletLabel.trim() || "Main wallet", is_primary: true }).eq("id", walletId);
        setWallets((prev) =>
          prev.map((w) => ({
            ...w,
            is_primary: w.id === walletId,
            label: w.id === walletId ? walletLabel.trim() || "Main wallet" : w.label,
          }))
        );
      } else {
        await supabase.from("user_wallets").update({ label: walletLabel.trim() || "Main wallet" }).eq("id", walletId);
        setWallets((prev) =>
          prev.map((w) => (w.id === walletId ? { ...w, label: walletLabel.trim() || "Main wallet" } : w))
        );
      }
      closeModal();
      showToast(t("walletUpdated"));
    } finally {
      setWalletSaving(false);
    }
  }

  async function handleRemoveWallet(wallet: Wallet) {
    if (wallet.is_primary) {
      showToast(t("cantRemovePrimary"), false);
      closeModal();
      return;
    }
    setWalletSaving(true);
    try {
      const { error } = await supabase.from("user_wallets").delete().eq("id", wallet.id);
      if (error) { showToast(t("error"), false); return; }
      setWallets((prev) => prev.filter((w) => w.id !== wallet.id));
      closeModal();
      showToast(t("walletRemoved"));
    } finally {
      setWalletSaving(false);
    }
  }

  // ── Account operations ─────────────────────────────────────────────────────

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdError, setPwdError]     = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) { setPwdError(t("passwordTooShort")); return; }
    setPwdError(null);
    setPwdSaving(true);
    try {
      // Re-authenticate first to verify current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (signInErr) { setPwdError(t("wrongCurrentPassword")); return; }

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) {
        devLog("updateUser", error);
        setPwdError(t("error"));
        return;
      }
      closeModal();
      setCurrentPwd(""); setNewPwd("");
      showToast(t("passwordChanged"));
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteInput !== "DELETE") return;
    setDeleteSaving(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) { showToast(t("error"), false); return; }
      await supabase.auth.signOut();
      router.push(locale === "fr" ? "/fr" : "/");
    } finally {
      setDeleteSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(locale === "fr" ? "/fr" : "/");
    router.refresh();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const p = locale === "fr" ? "/fr" : "";

  return (
    <>
      {toast && <Toast message={toast.message} ok={toast.ok} />}

      <div className="space-y-6">
        {/* Not-onboarded banner */}
        {!initialProfile.onboarded_at && (
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-900 border border-teal-500/30 rounded-lg px-4 py-2.5">
            <span className="text-slate-400">{t("notOnboardedBanner")}</span>
            <Link
              href={`${p}/onboarding`}
              className="text-teal-400 hover:text-teal-300 transition-colors font-medium whitespace-nowrap"
            >
              {t("notOnboardedLink")}
            </Link>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-slate-100 border-b-2 border-teal-400 -mb-px"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {/* ── Profile tab ─────────────────────────────────────── */}
        {activeTab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-6">
            <h2 className="font-semibold text-slate-100">{t("profileTitle")}</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">{t("username")}</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")}
                maxLength={30}
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">{t("profileType")}</label>
              <div className="space-y-2">
                {PROFILE_TYPES.map(({ type, emoji, labelKey }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProfileType(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      profileType === type
                        ? "border-teal-400 bg-teal-400/5 text-slate-100"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="text-lg shrink-0">{emoji}</span>
                    <span className="text-sm font-medium text-left">
                      {tOB(labelKey as Parameters<typeof tOB>[0])}
                    </span>
                    <div
                      className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                        profileType === type ? "border-teal-400 bg-teal-400" : "border-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">{t("language")}</label>
              <div className="flex gap-2">
                {(["en", "fr"] as const).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setProfileLocale(loc)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      profileLocale === loc
                        ? "border-teal-400 bg-teal-400/10 text-slate-100"
                        : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {loc === "en" ? t("languageEn") : t("languageFr")}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!profileChanged || profileSaving}
              className="bg-teal-500 hover:bg-teal-600 text-white border-transparent h-10 px-6 disabled:opacity-40"
            >
              {profileSaving ? t("saving") : t("saveChanges")}
            </Button>
          </form>
        )}

        {/* ── Wallets tab ──────────────────────────────────────── */}
        {activeTab === "wallets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">{t("walletsTitle")}</h2>
              <Button
                onClick={openAddWallet}
                className="bg-teal-500 hover:bg-teal-600 text-white border-transparent h-8 text-sm"
              >
                {t("addWallet")}
              </Button>
            </div>

            {wallets.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">{t("noWallets")}</p>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{w.label}</span>
                        {w.is_primary && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30">
                            {t("primaryBadge")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono truncate block">
                        {w.address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditWallet(w)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {t("editWallet")}
                      </button>
                      <button
                        onClick={() => setModal({ type: "remove-wallet", wallet: w })}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        {t("removeWallet")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Subscription tab ─────────────────────────────────── */}
        {activeTab === "subscription" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-100">{t("subscriptionTitle")}</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              {initialProfile.subscription_tier === "pro" ? (
                <>
                  <p className="font-medium text-teal-400">{t("proPlan")}</p>
                  {initialProfile.subscription_ends_at && (
                    <p className="text-sm text-slate-400">
                      {t("proEndsAt", {
                        date: new Date(initialProfile.subscription_ends_at).toLocaleDateString(),
                      })}
                    </p>
                  )}
                  <Button disabled className="border-slate-700 text-slate-400 h-9 text-sm">
                    {t("manageSubscription")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-200">{t("freePlan")}</p>
                  <p className="text-sm text-slate-500">{t("freeFeatures")}</p>
                  <div className="relative inline-block">
                    <Button
                      disabled
                      className="bg-teal-500/30 text-teal-300/60 border-transparent h-9 text-sm cursor-not-allowed"
                    >
                      {t("upgradePro")}
                    </Button>
                    <span className="ml-2 text-xs text-slate-600">{t("upgradeSoon")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Account tab ──────────────────────────────────────── */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <h2 className="font-semibold text-slate-100">{t("accountTitle")}</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300 block">{t("emailLabel")}</label>
              <div className="h-10 flex items-center px-2.5 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 text-sm font-mono">
                {email}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => { setPwdError(null); setCurrentPwd(""); setNewPwd(""); setModal({ type: "change-password" }); }}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:text-slate-100 h-9 text-sm"
              >
                {t("changePassword")}
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-red-800/50 text-red-400 hover:bg-red-500/10 h-9 text-sm"
              >
                {t("signOutBtn")}
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-6 space-y-3">
              <p className="text-sm font-medium text-slate-400">{t("dangerZone")}</p>
              <Button
                onClick={() => { setDeleteInput(""); setModal({ type: "delete-account" }); }}
                variant="outline"
                className="border-red-800/50 text-red-400 hover:bg-red-500/10 h-9 text-sm"
              >
                {t("deleteAccount")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}

      {modal?.type === "add-wallet" && (
        <Modal onClose={closeModal} title={t("modalAddTitle")}>
          <form onSubmit={handleAddWallet} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t("addressLabel")}</label>
              <Input
                value={walletAddr}
                onChange={(e) => { setWalletAddr(e.target.value); setWalletError(null); }}
                placeholder={t("addressPlaceholder")}
                className="font-mono bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t("labelLabel")}</label>
              <Input
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                placeholder={t("labelPlaceholder")}
                maxLength={50}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={walletPrimary}
                onChange={(e) => setWalletPrimary(e.target.checked)}
                className="accent-teal-500"
              />
              {t("setPrimary")}
            </label>
            {walletError && <p className="text-xs text-red-400">{walletError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeModal}
                className="border-slate-700 text-slate-400 h-8 text-sm">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={walletSaving}
                className="bg-teal-500 hover:bg-teal-600 text-white border-transparent h-8 text-sm">
                {walletSaving ? t("saving") : t("confirm")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "edit-wallet" && (
        <Modal onClose={closeModal} title={t("modalEditTitle")}>
          <form onSubmit={(e) => handleEditWallet(e, modal.wallet.id)} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t("labelLabel")}</label>
              <Input
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                placeholder={t("labelPlaceholder")}
                maxLength={50}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 h-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={walletPrimary}
                onChange={(e) => setWalletPrimary(e.target.checked)}
                className="accent-teal-500"
              />
              {t("setPrimary")}
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeModal}
                className="border-slate-700 text-slate-400 h-8 text-sm">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={walletSaving}
                className="bg-teal-500 hover:bg-teal-600 text-white border-transparent h-8 text-sm">
                {walletSaving ? t("saving") : t("confirm")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "remove-wallet" && (
        <Modal onClose={closeModal} title={t("modalRemoveTitle")}>
          <p className="text-sm text-slate-400">
            {t("confirmRemove", { label: modal.wallet.label })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}
              className="border-slate-700 text-slate-400 h-8 text-sm">
              {t("cancel")}
            </Button>
            <Button
              onClick={() => handleRemoveWallet(modal.wallet)}
              disabled={walletSaving}
              className="bg-red-500 hover:bg-red-600 text-white border-transparent h-8 text-sm"
            >
              {walletSaving ? t("saving") : t("confirm")}
            </Button>
          </div>
        </Modal>
      )}

      {modal?.type === "change-password" && (
        <Modal onClose={closeModal} title={t("changePassword")}>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t("currentPassword")}</label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                className="bg-slate-800 border-slate-700 text-slate-100 h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t("newPassword")}</label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                className="bg-slate-800 border-slate-700 text-slate-100 h-9"
              />
            </div>
            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeModal}
                className="border-slate-700 text-slate-400 h-8 text-sm">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pwdSaving}
                className="bg-teal-500 hover:bg-teal-600 text-white border-transparent h-8 text-sm">
                {pwdSaving ? t("saving") : t("updatePassword")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "delete-account" && (
        <Modal onClose={closeModal} title={t("deleteConfirmTitle")}>
          <p className="text-sm text-slate-400">{t("deleteConfirmText")}</p>
          <Input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder={t("deleteConfirmInput")}
            className="bg-slate-800 border-slate-700 text-slate-100 h-9"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}
              className="border-slate-700 text-slate-400 h-8 text-sm">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteInput !== "DELETE" || deleteSaving}
              className="bg-red-500 hover:bg-red-600 text-white border-transparent h-8 text-sm disabled:opacity-40"
            >
              {deleteSaving ? t("saving") : t("deleteConfirmBtn")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
