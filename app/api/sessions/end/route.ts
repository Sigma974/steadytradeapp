import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, started_at")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No active session" }, { status: 404 });
  }

  const endedAt = new Date();

  await supabase
    .from("sessions")
    .update({ ended_at: endedAt.toISOString() })
    .eq("id", session.id);

  const { data: triggers } = await supabase
    .from("triggers")
    .select("choice")
    .eq("session_id", session.id);

  const total = triggers?.length ?? 0;
  const clean = triggers?.filter((t) => t.choice === "clean").length ?? 0;
  const notClean = total - clean;
  const cleanPct = total > 0 ? Math.round((clean / total) * 100) : 0;
  const durationSeconds = Math.floor(
    (endedAt.getTime() - new Date(session.started_at).getTime()) / 1000
  );

  let insightKey: "solid" | "mixed" | "tough" | "empty";
  if (total === 0) insightKey = "empty";
  else if (cleanPct >= 80) insightKey = "solid";
  else if (cleanPct >= 60) insightKey = "mixed";
  else insightKey = "tough";

  return NextResponse.json({ durationSeconds, total, clean, notClean, cleanPct, insightKey });
}
