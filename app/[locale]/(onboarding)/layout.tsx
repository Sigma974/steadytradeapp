import { setRequestLocale } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function OnboardingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex justify-center px-4 py-10">
        <div className="w-full max-w-[600px]">{children}</div>
      </main>
    </div>
  );
}
