import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const OG_IMAGE = "https://steadytrade.org/og-default";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [OG_IMAGE],
    },
  };
}

const QUESTION_KEYS = [
  "q1", "q2", "q3", "q4", "q5", "q6",
  "q7", "q8", "q9", "q10", "q11", "q12",
] as const;

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FaqPage");

  return (
    <article className="space-y-10">
      <header className="pb-8 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100">{t("title")}</h1>
      </header>

      <dl className="space-y-8">
        {QUESTION_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <dt className="text-sm font-semibold text-slate-200">
              {t(`${key}.q` as Parameters<typeof t>[0])}
            </dt>
            <dd className="text-sm text-slate-400 leading-relaxed">
              {t(`${key}.a` as Parameters<typeof t>[0])}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
