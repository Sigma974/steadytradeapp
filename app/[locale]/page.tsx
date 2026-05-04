import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import TriggerScreen from "@/components/TriggerScreen";
import RebuildPage from "@/components/RebuildPage";

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

  return user ? <TriggerScreen userId={user.id} /> : <RebuildPage />;
}
