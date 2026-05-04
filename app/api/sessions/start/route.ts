import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  try {
    const { choice } = await req.json().catch(() => ({}));

    if (!choice || !["clean", "not_clean"].includes(choice)) {
      return NextResponse.json({ error: "Missing choice (clean | not_clean)" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Enforce one active session at a time
    const { data: active } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .limit(1)
      .maybeSingle();

    if (active) {
      return NextResponse.json(
        { error: "Session already active", sessionId: active.id },
        { status: 409 }
      );
    }

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (sessionErr || !session) {
      console.error("[sessions/start] insert error:", sessionErr?.message, sessionErr?.code);
      return NextResponse.json({ error: sessionErr?.message ?? "Failed to create session" }, { status: 500 });
    }

    // Log the initial session_start trigger
    const { error: triggerErr } = await supabase
      .from("triggers")
      .insert({ choice, user_id: user.id, session_id: session.id, trigger_type: "session_start" });

    if (triggerErr) {
      console.error("[sessions/start] trigger insert error:", triggerErr.message);
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("[sessions/start] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
