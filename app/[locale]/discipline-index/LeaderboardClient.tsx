"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getScoreTier } from "@/lib/score-tiers";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Row = {
  rank: number;
  wallet_address: string;
  steady_score: number;
  verdict: string | null;
  pnl_net: number;
  win_rate: number;
  trades_count: number;
  twitter_handle: string | null;
  claimed_status: string | null;
};

type Props = {
  rows: Row[];
  userAddresses: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtPnl(pnl: number) {
  const abs = Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return {
    text: `${pnl >= 0 ? "+" : "-"}$${abs}`,
    cls: pnl >= 0 ? "text-teal-400" : "text-red-400",
  };
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/i;
const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/;

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ── Submit form ───────────────────────────────────────────────────────────────

function SubmitForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (status: "added" | "filtered") => void;
}) {
  const t = useTranslations("DisciplineIndex");
  const [address, setAddress] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedAddress = address.trim().toLowerCase();
    const trimmedHandle = handle.trim().replace(/^@/, "");

    if (!ADDRESS_RE.test(trimmedAddress)) {
      setError(t("errorInvalidAddress"));
      return;
    }
    if (trimmedHandle && !HANDLE_RE.test(trimmedHandle)) {
      setError(t("errorInvalidHandle"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: trimmedAddress,
          ...(trimmedHandle && { twitter_handle: trimmedHandle }),
        }),
      });

      const data: { status?: string; error?: string; reason?: string } =
        await res.json();

      if (!res.ok) {
        const errorMap: Record<string, string> = {
          invalid_address: t("errorInvalidAddress"),
          invalid_handle: t("errorInvalidHandle"),
          already_exists_use_claim: t("errorAlreadyExistsUseClaim"),
          rate_limited: t("errorRateLimited"),
          db_error: t("errorGeneric"),
        };
        setError(errorMap[data.error ?? ""] ?? t("errorGeneric"));
        return;
      }

      if (data.status === "already_exists") {
        setError(t("errorAlreadyExists"));
        return;
      }

      onSuccess(data.status === "added" ? "added" : "filtered");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm text-slate-300">
          {t("submitAddressLabel")}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("submitAddressPlaceholder")}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none"
          disabled={loading}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm text-slate-300">
          {t("submitHandleLabel")}
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={t("submitHandlePlaceholder")}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none"
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {t("cancelBtn")}
        </button>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "…" : t("submitBtn")}
        </button>
      </div>
    </form>
  );
}

// ── Claim form ────────────────────────────────────────────────────────────────

function ClaimForm({
  address,
  onClose,
  onSuccess,
}: {
  address: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("DisciplineIndex");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedHandle = handle.trim().replace(/^@/, "");

    if (!trimmedHandle) {
      setError(t("errorHandleRequired"));
      return;
    }
    if (!HANDLE_RE.test(trimmedHandle)) {
      setError(t("errorInvalidHandle"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, twitter_handle: trimmedHandle }),
      });

      const data: { status?: string; error?: string } = await res.json();

      if (!res.ok) {
        const errorMap: Record<string, string> = {
          invalid_address: t("errorInvalidAddress"),
          invalid_handle: t("errorInvalidHandle"),
          handle_required: t("errorHandleRequired"),
          rate_limited: t("errorRateLimited"),
          address_not_found: t("errorAddressNotFound"),
          already_claimed: t("errorAlreadyClaimed"),
          handle_already_used: t("errorHandleAlreadyUsed"),
          db_error: t("errorGeneric"),
        };
        setError(errorMap[data.error ?? ""] ?? t("errorGeneric"));
        return;
      }

      onSuccess();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm text-slate-300">
          {t("claimAddressLabel")}
        </label>
        <div className="w-full rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm text-slate-400 font-mono select-none">
          {abbrev(address)}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm text-slate-300">
          {t("claimHandleLabel")}
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={t("claimHandlePlaceholder")}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none"
          disabled={loading}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        {t("claimModalInfo")}
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {t("cancelBtn")}
        </button>
        <button
          type="submit"
          disabled={loading || !handle.trim()}
          className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "…" : t("claimBtn")}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeaderboardClient({ rows, userAddresses }: Props) {
  const t = useTranslations("DisciplineIndex");
  const tVerdict = useTranslations("Cards.Verdict");
  const tScore = useTranslations("Cards.SteadyScore");
  const router = useRouter();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [claimAddress, setClaimAddress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const userSet = new Set(userAddresses);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function handleSubmitSuccess(status: "added" | "filtered") {
    setSubmitOpen(false);
    showToast(
      status === "added" ? t("submitSuccess") : t("submitFiltered"),
      status === "added"
    );
    router.refresh();
  }

  function handleClaimSuccess() {
    setClaimAddress(null);
    showToast(t("claimSuccess"), true);
    router.refresh();
  }

  return (
    <>
      {/* Leaderboard table */}
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-20">
          {t("noData")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                {(
                  [
                    { label: t("colRank"), align: "left", cls: "w-12" },
                    { label: t("colTrader"), align: "left", cls: "" },
                    { label: t("colScore"), align: "right", cls: "" },
                    {
                      label: t("colVerdict"),
                      align: "left",
                      cls: "hidden sm:table-cell",
                    },
                    { label: t("colPnl"), align: "right", cls: "" },
                    {
                      label: t("colWinRate"),
                      align: "right",
                      cls: "hidden md:table-cell",
                    },
                    {
                      label: t("colTrades"),
                      align: "right",
                      cls: "hidden md:table-cell",
                    },
                  ] as const
                ).map(({ label, align, cls }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-${align} ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {rows.map((row) => {
                const isMe = userSet.has(row.wallet_address.toLowerCase());
                const pnl = fmtPnl(row.pnl_net);
                const verdictTitle = row.verdict
                  ? tVerdict(
                      `${row.verdict}.title` as Parameters<typeof tVerdict>[0]
                    )
                  : null;

                return (
                  <tr
                    key={row.wallet_address}
                    className={
                      isMe
                        ? "bg-teal-950/40 ring-1 ring-inset ring-teal-500/20"
                        : "hover:bg-slate-900/40 transition-colors"
                    }
                  >
                    {/* Rank */}
                    <td className="px-4 py-4">
                      <span className="text-slate-500 font-mono text-xs tabular-nums">
                        {row.rank}
                      </span>
                    </td>

                    {/* Trader */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/trader/${row.wallet_address}`}
                          className="font-mono text-sm text-slate-200 hover:text-white transition-colors"
                        >
                          {abbrev(row.wallet_address)}
                        </Link>

                        {row.twitter_handle ? (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            @{row.twitter_handle}
                            {row.claimed_status === "verified" ? (
                              <span
                                title={t("verifiedTooltip")}
                                aria-label={t("verifiedTooltip")}
                              >
                                ✅
                              </span>
                            ) : row.claimed_status === "unverified" ? (
                              <span
                                title={t("unverifiedTooltip")}
                                aria-label={t("unverifiedTooltip")}
                                className="opacity-40"
                              >
                                ⚪
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setClaimAddress(row.wallet_address)}
                            className="self-start text-xs text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            {t("claimProfile")}
                          </button>
                        )}

                        {isMe && (
                          <span className="text-xs text-teal-400 font-medium">
                            {t("you")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Steady Score */}
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/trader/${row.wallet_address}`}
                        className="block"
                      >
                        <span
                          className={`font-bold text-base tabular-nums ${
                            getScoreTier(row.steady_score).tailwindText
                          }`}
                        >
                          {row.steady_score}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                          {tScore(
                            `labels.${
                              getScoreTier(row.steady_score).key
                            }` as Parameters<typeof tScore>[0]
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Verdict */}
                    <td className="px-4 py-4 hidden sm:table-cell max-w-[200px]">
                      <Link
                        href={`/trader/${row.wallet_address}`}
                        className="block"
                      >
                        <span className="text-slate-300 text-xs leading-snug line-clamp-2">
                          {verdictTitle ?? (
                            <span className="text-slate-600">—</span>
                          )}
                        </span>
                      </Link>
                    </td>

                    {/* Net P&L */}
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/trader/${row.wallet_address}`}
                        className="block"
                      >
                        <span
                          className={`font-mono text-sm tabular-nums ${pnl.cls}`}
                        >
                          {pnl.text}
                        </span>
                      </Link>
                    </td>

                    {/* Win rate */}
                    <td className="px-4 py-4 text-right hidden md:table-cell">
                      <Link
                        href={`/trader/${row.wallet_address}`}
                        className="block"
                      >
                        <span className="text-slate-300 font-mono text-sm tabular-nums">
                          {(row.win_rate * 100).toFixed(0)}%
                        </span>
                      </Link>
                    </td>

                    {/* Trades */}
                    <td className="px-4 py-4 text-right hidden md:table-cell">
                      <Link
                        href={`/trader/${row.wallet_address}`}
                        className="block"
                      >
                        <span className="text-slate-400 font-mono text-sm tabular-nums">
                          {row.trades_count}
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit wallet button */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="text-sm text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 transition-colors"
        >
          + {t("submitWallet")}
        </button>
      </div>

      {/* Submit modal */}
      {submitOpen && (
        <Modal
          onClose={() => setSubmitOpen(false)}
          title={t("submitModalTitle")}
        >
          <SubmitForm
            onClose={() => setSubmitOpen(false)}
            onSuccess={handleSubmitSuccess}
          />
        </Modal>
      )}

      {/* Claim modal */}
      {claimAddress && (
        <Modal
          onClose={() => setClaimAddress(null)}
          title={t("claimModalTitle")}
        >
          <ClaimForm
            address={claimAddress}
            onClose={() => setClaimAddress(null)}
            onSuccess={handleClaimSuccess}
          />
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.ok
              ? "bg-teal-900 border border-teal-700 text-teal-100"
              : "bg-slate-800 border border-slate-600 text-slate-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
