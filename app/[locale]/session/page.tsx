import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import SessionTriggerScreen from "@/components/SessionTriggerScreen";

type Props = { params: Promise<{ locale: string }> };

export default async function SessionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(locale === "fr" ? "/fr/signin" : "/signin");

  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, started_at")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSession) redirect(locale === "fr" ? "/fr" : "/");

  return (
    <SessionTriggerScreen
      sessionId={activeSession.id}
      userId={user.id}
      startedAt={activeSession.started_at}
    />
  );
}
