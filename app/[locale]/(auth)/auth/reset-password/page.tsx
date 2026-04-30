import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ResetPasswordForm from "./ResetPasswordForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AuthPage" });
  return { title: t("resetMetaTitle") };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResetPasswordForm />;
}
