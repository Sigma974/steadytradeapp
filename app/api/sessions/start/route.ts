import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(_req: NextRequest) {
  try {
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

    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[sessions/start] insert error:", error?.message, error?.code);
      return NextResponse.json({ error: error?.message ?? "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: data.id });
  } catch (err) {
    console.error("[sessions/start] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
