import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: wallet } = await supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ address: wallet?.address ?? null });
  } catch (err) {
    console.error("[wallet/GET] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json().catch(() => ({}));

    if (!address || !ADDRESS_RE.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Upsert: insert or update the single wallet row for this user
    const { error } = await supabase
      .from("wallets")
      .upsert({ user_id: user.id, address }, { onConflict: "user_id" });

    if (error) {
      console.error("[wallet/POST] upsert error:", error.message);
      return NextResponse.json({ error: "Failed to save wallet" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[wallet/POST] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
