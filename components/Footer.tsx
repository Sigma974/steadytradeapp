import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed max-w-2xl mx-auto">
          Steady is not investment advice. Analytics are provided for informational purposes only.
          Crypto trading carries a significant risk of capital loss.
          You are solely responsible for your trading decisions.
        </p>

        {/* Legal links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-600">
          <Link href="/legal/terms" className="hover:text-slate-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="hover:text-slate-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/legal/disclaimer" className="hover:text-slate-400 transition-colors">
            Disclaimer
          </Link>
          <Link href="/legal/legal-notice" className="hover:text-slate-400 transition-colors">
            Legal Notice
          </Link>
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          © {new Date().getFullYear()} Steady. Data sourced from the public Hyperliquid API.
        </p>
      </div>
    </footer>
  );
}
