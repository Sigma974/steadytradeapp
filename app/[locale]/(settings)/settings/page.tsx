import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import WalletSettings from "@/components/WalletSettings";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
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

  const { data: wallet } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", user.id)
    .maybeSingle();

  return <WalletSettings currentAddress={wallet?.address ?? null} locale={locale} />;
}
