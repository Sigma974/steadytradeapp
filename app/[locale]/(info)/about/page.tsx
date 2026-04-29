import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutPage");

  const whatItems = [t("what1"), t("what2"), t("what3"), t("what4")];
  const doesNotItems = [
    t("doesNot1"),
    t("doesNot2"),
    t("doesNot3"),
    t("doesNot4"),
    t("doesNot5"),
  ];

  return (
    <article className="space-y-10">
      <header className="space-y-3 pb-8 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100">{t("title")}</h1>
        <p className="text-slate-400 leading-relaxed">{t("intro")}</p>
      </header>

      <Section title={t("whyTitle")}>
        <p>{t("why1")}</p>
        <p>{t("why2")}</p>
      </Section>

      <Section title={t("whatTitle")}>
        <ul className="space-y-2">
          {whatItems.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-slate-600 select-none mt-0.5">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-slate-500 text-sm">{t("whatNote")}</p>
      </Section>

      <Section title={t("doesNotTitle")}>
        <ul className="space-y-2">
          {doesNotItems.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-slate-600 select-none mt-0.5">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("whoTitle")}>
        <p>{t("who1")}</p>
        <p className="mt-3">
          {t("whoContact")}{" "}
          <a
            href="https://twitter.com/usesteadytrade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 underline underline-offset-2 hover:text-white transition-colors"
          >
            {t("twitterLink")}
          </a>
        </p>
      </Section>

      <Section title={t("pricingTitle")}>
        <p>{t("pricing1")}</p>
        <p>{t("pricing2")}</p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-200">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
