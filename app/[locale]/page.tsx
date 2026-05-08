import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import SteadyLanding from "@/components/SteadyLanding";
import Dashboard from "@/components/Dashboard";

type SessionSummary = {
  id: string;
  started_at: string;
  ended_at: string;
  total: number;
  clean: number;
};

type ActiveSession = { id: string; started_at: string } | null;

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <SteadyLanding />;

  // Active session + past sessions + wallet fetched in parallel
  const [activeResult, pastResult, walletResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, started_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, started_at, ended_at")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const activeSession: ActiveSession = activeResult.data ?? null;
  const sessionsRaw = pastResult.data ?? [];
  const hasWallet = !!walletResult.data?.address;

  // Fetch trigger counts for completed sessions
  const sessionIds = sessionsRaw.map((s) => s.id);
  const triggersBySid = new Map<string, { clean: number; total: number }>();

  if (sessionIds.length > 0) {
    const { data: triggersRaw } = await supabase
      .from("triggers")
      .select("session_id, choice")
      .in("session_id", sessionIds);

    for (const t of triggersRaw ?? []) {
      const curr = triggersBySid.get(t.session_id) ?? { clean: 0, total: 0 };
      triggersBySid.set(t.session_id, {
        total: curr.total + 1,
        clean: curr.clean + (t.choice === "clean" ? 1 : 0),
      });
    }
  }

  const pastSessions: SessionSummary[] = sessionsRaw.map((s) => ({
    id: s.id,
    started_at: s.started_at,
    ended_at: s.ended_at!,
    total: triggersBySid.get(s.id)?.total ?? 0,
    clean: triggersBySid.get(s.id)?.clean ?? 0,
  }));

  return (
    <Dashboard
      activeSession={activeSession}
      pastSessions={pastSessions}
      hasWallet={hasWallet}
    />
  );
}
