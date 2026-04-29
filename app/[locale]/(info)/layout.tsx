import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function InfoLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const homeHref = locale === "fr" ? "/fr" : "/";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={homeHref}
            className="text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors"
          >
            Steady
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex-1 w-full max-w-[700px] mx-auto px-6 py-12">
        {children}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
