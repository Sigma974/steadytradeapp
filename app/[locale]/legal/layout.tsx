import Link from "next/link";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LegalLayout({ children, params }: Props) {
  const { locale } = await params;
  const homeHref = locale === "fr" ? "/fr" : "/";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={homeHref} className="text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors">
            Steady
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm text-slate-500">Legal</span>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {children}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
