import Link from "next/link";

interface Props {
  locale?: string;
}

export default function Footer({ locale = "en" }: Props) {
  const p = locale === "fr" ? "/fr" : "";
  const aboutLabel = locale === "fr" ? "À propos" : "About";

  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed max-w-2xl mx-auto">
          Steady is not investment advice. Analytics are provided for
          informational purposes only. Crypto trading carries a significant risk
          of capital loss. You are solely responsible for your trading decisions.
        </p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-600">
          <Link
            href={`${p}/about`}
            className="hover:text-slate-400 transition-colors"
          >
            {aboutLabel}
          </Link>
          <Link
            href={`${p}/faq`}
            className="hover:text-slate-400 transition-colors"
          >
            FAQ
          </Link>
          <a
            href="https://twitter.com/usesteadytrade"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-400 transition-colors"
          >
            Twitter ↗
          </a>
          <span className="text-slate-800 select-none">·</span>
          <Link
            href={`${p}/legal/terms`}
            className="hover:text-slate-400 transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href={`${p}/legal/privacy`}
            className="hover:text-slate-400 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href={`${p}/legal/disclaimer`}
            className="hover:text-slate-400 transition-colors"
          >
            Disclaimer
          </Link>
          <Link
            href={`${p}/legal/legal-notice`}
            className="hover:text-slate-400 transition-colors"
          >
            Legal Notice
          </Link>
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          © 2026 Steady. Data sourced from the public Hyperliquid API.
        </p>
      </div>
    </footer>
  );
}
