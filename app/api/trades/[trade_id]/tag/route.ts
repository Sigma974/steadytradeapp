import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const VALID_TAGS = ["CLEAN", "NOT_CLEAN", "DONT_REMEMBER"] as const;
type Tag = (typeof VALID_TAGS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trade_id: string }> }
) {
  try {
    const { trade_id } = await params;
    if (!trade_id) {
      return NextResponse.json({ error: "Missing trade_id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const tag = body?.tag as Tag | null | undefined;

    if (tag !== null && tag !== undefined && !VALID_TAGS.includes(tag as Tag)) {
      return NextResponse.json(
        { error: "Invalid tag (expected CLEAN | NOT_CLEAN | DONT_REMEMBER | null)" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing, error: fetchError } = await supabase
      .from("trades")
      .select("id, user_id")
      .eq("id", trade_id)
      .maybeSingle();

    if (fetchError) {
      console.error("[trades/tag] SELECT failed:", fetchError.code, fetchError.message);
      return NextResponse.json({ error: "db_read_failed" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("trades")
      .update({ tag: tag ?? null })
      .eq("id", trade_id)
      .eq("user_id", user.id)
      .select("id, tag")
      .maybeSingle();

    if (error) {
      console.error("[trades/tag] UPDATE failed:", error.code, error.message);
      return NextResponse.json({ error: "db_write_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, trade: data });
  } catch (err) {
    console.error("[trades/tag] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
