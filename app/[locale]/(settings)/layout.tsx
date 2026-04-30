import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SettingsLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(locale === "fr" ? "/fr/auth?tab=signin" : "/auth?tab=signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 py-10">
        {children}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
