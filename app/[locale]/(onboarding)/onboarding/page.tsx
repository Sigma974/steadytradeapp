import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import OnboardingFlow from "./OnboardingFlow";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OnboardingPage" });
  return { title: t("metaTitle") };
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(locale === "fr" ? "/fr/auth" : "/auth");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarded_at, username")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded_at) {
    redirect(locale === "fr" ? "/fr" : "/");
  }

  return <OnboardingFlow username={profile?.username ?? null} />;
}
