import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AuthForm from "./AuthForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AuthPage" });
  return { title: t("metaTitle") };
}

export default async function AuthPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab, error } = await searchParams;
  setRequestLocale(locale);

  return (
    <AuthForm
      initialTab={tab === "signin" ? "signin" : "signup"}
      callbackError={error}
    />
  );
}
