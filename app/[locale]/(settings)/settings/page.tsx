import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import SettingsTabs from "./SettingsTabs";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SettingsPage" });
  return { title: t("metaTitle") };
}

export default async function SettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already redirects if not authenticated, but type-guard here
  if (!user) return null;

  const [{ data: profile }, { data: wallets }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("username, profile_type, locale, subscription_tier, subscription_ends_at, onboarded_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_wallets")
      .select("id, address, label, is_primary")
      .eq("user_id", user.id)
      .order("added_at", { ascending: true }),
  ]);

  return (
    <SettingsTabs
      userId={user.id}
      email={user.email ?? ""}
      profile={profile ?? {
        username: null,
        profile_type: null,
        locale: "en",
        subscription_tier: "free",
        subscription_ends_at: null,
        onboarded_at: null,
      }}
      wallets={wallets ?? []}
      initialTab={tab ?? "profile"}
    />
  );
}
