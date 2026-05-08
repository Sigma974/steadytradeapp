import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  BookOpen,
  LineChart,
  Target,
  Camera,
  Tag,
  Brain,
  Sparkles,
  Download,
  FileText,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Check,
  Minus,
  Twitter,
  Github,
  Mail,
  ChevronRight,
  Quote,
  CircleDot,
  Flame,
  Moon,
  Compass,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  PRIMITIVES                                */
/* -------------------------------------------------------------------------- */

const Container = ({ children, className = "" }) => (
  <div className={`mx-auto w-full max-w-[1200px] px-6 md:px-10 ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ children, accent = "Section" }) => (
  <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60 backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
    {accent}
  </div>
);

const Headline = ({ children, className = "" }) => (
  <h2
    className={`font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-white md:text-[56px] ${className}`}
    style={{ fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif' }}
  >
    {children}
  </h2>
);

const SubText = ({ children, className = "" }) => (
  <p className={`text-base leading-relaxed text-white/55 md:text-lg ${className}`}>
    {children}
  </p>
);

/* -------------------------------------------------------------------------- */
/*                                 BACKGROUND                                  */
/* -------------------------------------------------------------------------- */

const NoiseFilter = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025]">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

const GridBackground = () => (
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.07]"
    style={{
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
      backgroundSize: "64px 64px",
      maskImage:
        "radial-gradient(ellipse at center, black 30%, transparent 75%)",
      WebkitMaskImage:
        "radial-gradient(ellipse at center, black 30%, transparent 75%)",
    }}
  />
);

const HeroGlow = () => (
  <>
    <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[120px]" />
    <div className="pointer-events-none absolute left-1/2 top-[40%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/[0.05] blur-[100px]" />
  </>
);

/* -------------------------------------------------------------------------- */
/*                                    NAV                                      */
/* -------------------------------------------------------------------------- */

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <Container>
        <div
          className={`flex items-center justify-between rounded-2xl border px-5 py-3 transition-all duration-500 ${
            scrolled
              ? "border-white/10 bg-black/60 backdrop-blur-xl"
              : "border-transparent bg-transparent"
          }`}
        >
          <a href="#" className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-md bg-emerald-400/20 blur-sm" />
              <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-300 to-emerald-500">
                <CircleDot className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
              </div>
            </div>
            <span
              className="text-[17px] font-semibold tracking-tight text-white"
              style={{ fontFamily: '"Fraunces", Georgia, serif' }}
            >
              Steady
            </span>
          </a>

          <nav className="hidden items-center gap-9 md:flex">
            {["Features", "Psychology", "Pricing", "Customers"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[13.5px] text-white/60 transition-colors hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#"
              className="hidden text-[13.5px] text-white/60 transition-colors hover:text-white md:inline"
            >
              Sign in
            </a>
            <a
              href="#"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-black transition-all hover:bg-white/90"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </Container>
    </motion.header>
  );
};

/* -------------------------------------------------------------------------- */
/*                              DASHBOARD MOCKUP                               */
/* -------------------------------------------------------------------------- */

const EquityCurve = () => {
  const points = [
    [0, 80], [8, 78], [16, 75], [24, 72], [32, 70], [40, 65],
    [48, 62], [56, 58], [64, 50], [72, 48], [80, 42], [88, 38],
    [96, 32], [100, 28],
  ];
  const path = points
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  const areaPath = `${path} L 100 100 L 0 100 Z`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="eqArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#eqArea)" />
      <motion.path
        d={path}
        fill="none"
        stroke="rgb(110, 231, 183)"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

const DashboardMock = () => {
  return (
    <div className="relative w-full">
      {/* outer glow */}
      <div className="absolute -inset-x-20 -inset-y-20 -z-10 rounded-[40px] bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        {/* top bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="ml-3 flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 text-[10.5px] text-white/40">
            <Shield className="h-3 w-3" />
            steady.app/journal
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10.5px] text-white/40">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live session
          </div>
        </div>

        {/* dashboard body */}
        <div className="grid grid-cols-12 gap-3 p-5 md:p-6">
          {/* Sidebar */}
          <aside className="col-span-12 hidden flex-col gap-1 md:col-span-2 md:flex">
            {[
              { icon: Activity, label: "Overview", active: true },
              { icon: BookOpen, label: "Journal" },
              { icon: LineChart, label: "Analytics" },
              { icon: Target, label: "Discipline" },
              { icon: Brain, label: "Insights" },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11.5px] ${
                  item.active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/40"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="col-span-12 flex flex-col gap-3 md:col-span-10">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Net P&L", value: "+$12,847", trend: "+18.4%", up: true },
                { label: "Win rate", value: "64.2%", trend: "+3.1%", up: true },
                { label: "Avg R:R", value: "1.84", trend: "stable", up: null },
                { label: "Discipline", value: "92", trend: "+7 pts", up: true },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    {s.label}
                  </div>
                  <div className="mt-1 font-serif text-[20px] tracking-tight text-white" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                    {s.value}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      s.up === true ? "text-emerald-400" : s.up === false ? "text-red-400" : "text-white/40"
                    }`}
                  >
                    {s.trend}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Equity + journal */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">
                      Equity curve
                    </div>
                    <div className="mt-0.5 text-[12px] text-white/60">
                      Last 30 days
                    </div>
                  </div>
                  <div className="flex gap-1 text-[10px]">
                    {["1W", "1M", "3M", "1Y"].map((t, i) => (
                      <span
                        key={t}
                        className={`rounded px-2 py-0.5 ${
                          i === 1
                            ? "bg-white/[0.08] text-white"
                            : "text-white/30"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="h-32 w-full">
                  <EquityCurve />
                </div>
              </div>

              <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Recent trades
                </div>
                <div className="mt-3 space-y-2.5">
                  {[
                    { sym: "NQ", side: "Long", pnl: "+$420", ok: true, tag: "Clean" },
                    { sym: "BTC", side: "Short", pnl: "+$185", ok: true, tag: "Clean" },
                    { sym: "ES", side: "Long", pnl: "−$95", ok: false, tag: "Not clean" },
                    { sym: "ETH", side: "Long", pnl: "+$312", ok: true, tag: "Clean" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80">{t.sym}</span>
                        <span className="text-white/30">{t.side}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] ${
                            t.ok
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {t.tag}
                        </span>
                        <span
                          className={`tabular-nums ${
                            t.ok ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {t.pnl}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* discipline bar */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Discipline this week
                </div>
                <div className="text-[11px] text-emerald-300">5 / 5 sessions clean</div>
              </div>
              <div className="flex gap-1.5">
                {[1, 1, 1, 1, 1, 0.4, 0].map((v, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]"
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${v * 100}%` }}
                      transition={{ duration: 1, delay: 0.6 + i * 0.06 }}
                      className={`h-full ${
                        v === 1
                          ? "bg-emerald-400"
                          : v > 0
                          ? "bg-amber-400/70"
                          : "bg-white/5"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-white/30">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    HERO                                     */
/* -------------------------------------------------------------------------- */

const Hero = () => (
  <section className="relative overflow-hidden pb-24 pt-36 md:pb-32 md:pt-44">
    <GridBackground />
    <HeroGlow />
    <NoiseFilter />

    <Container className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <a
          href="#"
          className="group mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-white/70 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
            New
          </span>
          AI insights now in private beta
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </a>

        <h1
          className="max-w-4xl text-balance text-[44px] font-medium leading-[0.98] tracking-[-0.035em] text-white md:text-[80px]"
          style={{ fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif' }}
        >
          The trading journal
          <br />
          that builds{" "}
          <span className="relative inline-block italic text-emerald-300/95">
            consistency
            <svg
              className="absolute -bottom-2 left-0 h-2 w-full"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 0 5 Q 25 1 50 4 T 100 3"
                fill="none"
                stroke="rgb(110, 231, 183)"
                strokeWidth="1"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.8 }}
              />
            </svg>
          </span>
          .
        </h1>

        <p className="mt-7 max-w-xl text-pretty text-[16.5px] leading-relaxed text-white/55 md:text-[18px]">
          Analyze your trades, identify your mistakes, and become a more disciplined trader. The success comes from constancy — not luck.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-3 text-[14px] font-medium text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] transition-all hover:shadow-[0_10px_50px_-10px_rgba(255,255,255,0.6)]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 text-[14px] font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <Play className="h-3.5 w-3.5 fill-white/80" />
            Watch demo
          </a>
        </div>

        <div className="mt-7 flex items-center gap-5 text-[12px] text-white/40">
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> No credit card
          </span>
          <span className="hidden h-3 w-px bg-white/10 md:block" />
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> Free forever plan
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-20"
      >
        <DashboardMock />
      </motion.div>
    </Container>
  </section>
);

/* -------------------------------------------------------------------------- */
/*                              SOCIAL PROOF STRIP                             */
/* -------------------------------------------------------------------------- */

const SocialStrip = () => (
  <section className="relative border-y border-white/[0.06] bg-white/[0.01]">
    <Container className="py-10">
      <p className="mb-7 text-center text-[11px] uppercase tracking-[0.25em] text-white/30">
        Trusted by traders journaling on
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5 opacity-60">
        {["Hyperliquid", "Binance", "Bybit", "TradingView", "Interactive Brokers", "MetaTrader"].map((b) => (
          <span
            key={b}
            className="text-[15px] font-medium tracking-tight text-white/50"
          >
            {b}
          </span>
        ))}
      </div>
    </Container>
  </section>
);

/* -------------------------------------------------------------------------- */
/*                              PROBLEM SECTION                                */
/* -------------------------------------------------------------------------- */

const ProblemSection = () => {
  const problems = [
    {
      icon: Flame,
      title: "Revenge trading",
      desc: "Chasing losses with bigger size, breaking the very plan you wrote this morning.",
    },
    {
      icon: Brain,
      title: "Emotional decisions",
      desc: "FOMO, fear, hope — the same emotions hijacking the same setups, week after week.",
    },
    {
      icon: Activity,
      title: "Overtrading",
      desc: "Forty trades when your edge only exists on three. Death by a thousand commissions.",
    },
    {
      icon: FileText,
      title: "No review process",
      desc: "Closing the platform on Friday and somehow forgetting everything by Monday.",
    },
    {
      icon: Compass,
      title: "Inconsistency",
      desc: "A great week, then three bad ones. No idea what changed. No idea how to fix it.",
    },
  ];

  return (
    <section className="relative py-28 md:py-36">
      <Container>
        <div className="grid gap-16 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <SectionLabel accent="The problem" />
            <Headline>
              Most traders repeat the same mistakes.
            </Headline>
            <SubText className="mt-6">
              Trading is a feedback loop. Without a written record, the loop never closes — and the same lesson costs you again. And again.
            </SubText>
          </div>

          <div className="md:col-span-7">
            <div className="space-y-2">
              {problems.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="group flex items-start gap-5 rounded-xl border border-white/[0.05] bg-white/[0.01] p-5 transition-all hover:border-white/10 hover:bg-white/[0.025]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-emerald-400/20 group-hover:bg-emerald-400/[0.04]">
                    <p.icon className="h-4 w-4 text-white/50 transition-colors group-hover:text-emerald-300" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-medium text-white">
                        {p.title}
                      </h3>
                      <Minus className="h-4 w-4 text-white/20 transition-all group-hover:text-emerald-400/60" />
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">
                      {p.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                              SOLUTION SECTION                               */
/* -------------------------------------------------------------------------- */

const SolutionCard = ({ icon: Icon, title, desc, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent p-7 transition-all hover:border-white/[0.12]"
  >
    <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/[0.06] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />

    <div className="relative">
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <Icon className="h-5 w-5 text-emerald-300" strokeWidth={1.6} />
      </div>

      <h3
        className="mb-3 text-[22px] tracking-tight text-white"
        style={{ fontFamily: '"Fraunces", Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-white/55">{desc}</p>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">
          {accent.label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="font-serif text-[28px] text-white"
            style={{ fontFamily: '"Fraunces", Georgia, serif' }}
          >
            {accent.value}
          </span>
          <span className="text-[12px] text-emerald-300">{accent.delta}</span>
        </div>
      </div>
    </div>
  </motion.div>
);

const SolutionSection = () => (
  <section className="relative py-28 md:py-36">
    <Container>
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <SectionLabel accent="The solution" />
        <Headline>Steady helps you trade with clarity.</Headline>
        <SubText className="mx-auto mt-6 max-w-lg">
          Three pillars. One system. Built so the next trade is more deliberate than the last.
        </SubText>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <SolutionCard
          icon={BookOpen}
          title="Trading Journal"
          desc="Log every trade in seconds — entry, exit, setup, screenshots, and the emotional state behind the click."
          accent={{ label: "Avg log time", value: "12s", delta: "per trade" }}
          delay={0}
        />
        <SolutionCard
          icon={LineChart}
          title="Performance Analytics"
          desc="See the patterns hiding in your P&L. Win rate by setup, by hour, by symbol, by mood."
          accent={{ label: "Metrics tracked", value: "40+", delta: "auto-computed" }}
          delay={0.12}
        />
        <SolutionCard
          icon={Target}
          title="Discipline Tracking"
          desc="A single score that tells you whether you followed the plan — independent of whether the market paid."
          accent={{ label: "Discipline score", value: "92", delta: "+7 this week" }}
          delay={0.24}
        />
      </div>
    </Container>
  </section>
);

/* -------------------------------------------------------------------------- */
/*                              FEATURES BENTO                                 */
/* -------------------------------------------------------------------------- */

const FeatureCell = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-white/[0.005] p-6 transition-all hover:border-white/[0.12] ${className}`}
  >
    {children}
  </motion.div>
);

const FeatureLabel = ({ icon: Icon, children }) => (
  <div className="mb-4 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em] text-emerald-300/80">
    <Icon className="h-3 w-3" strokeWidth={2} />
    {children}
  </div>
);

const FeatureTitle = ({ children }) => (
  <h3
    className="text-[20px] tracking-tight text-white"
    style={{ fontFamily: '"Fraunces", Georgia, serif' }}
  >
    {children}
  </h3>
);

const FeatureDesc = ({ children }) => (
  <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">{children}</p>
);

const FeaturesSection = () => (
  <section id="features" className="relative py-28 md:py-36">
    <Container>
      <div className="mb-16 grid gap-10 md:grid-cols-2 md:items-end">
        <div>
          <SectionLabel accent="Features" />
          <Headline>Every tool you need.<br />Nothing you don't.</Headline>
        </div>
        <SubText className="md:max-w-md md:justify-self-end">
          Steady is opinionated. Each feature is here because traders ranked it as essential to their improvement loop.
        </SubText>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2 md:gap-4">
        {/* Tagging - tall */}
        <FeatureCell className="md:row-span-2" delay={0}>
          <FeatureLabel icon={Tag}>Trade tagging</FeatureLabel>
          <FeatureTitle>Tag every trade. Find every pattern.</FeatureTitle>
          <FeatureDesc>
            Setup, market regime, mistake category, emotional state. Your tags become the lens that reveals what's actually working.
          </FeatureDesc>

          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { t: "breakout", c: "emerald" },
              { t: "continuation", c: "white" },
              { t: "FOMO", c: "amber" },
              { t: "A+ setup", c: "emerald" },
              { t: "early entry", c: "rose" },
              { t: "London open", c: "white" },
              { t: "chased", c: "rose" },
              { t: "patient", c: "emerald" },
            ].map((tag, i) => {
              const colors = {
                emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
                white: "border-white/10 bg-white/[0.03] text-white/60",
                amber: "border-amber-400/20 bg-amber-400/5 text-amber-300",
                rose: "border-rose-400/20 bg-rose-400/5 text-rose-300",
              };
              return (
                <span
                  key={i}
                  className={`rounded-md border px-2.5 py-1 text-[11.5px] ${colors[tag.c]}`}
                >
                  {tag.t}
                </span>
              );
            })}
          </div>

          <div className="mt-7 rounded-xl border border-white/[0.05] bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/30">
              Win rate by tag
            </div>
            <div className="mt-3 space-y-2">
              {[
                { tag: "A+ setup", val: 78 },
                { tag: "continuation", val: 64 },
                { tag: "FOMO", val: 24 },
                { tag: "chased", val: 18 },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 text-[11.5px]">
                  <span className="w-24 text-white/60">{row.tag}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.val}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                      className={`h-1 ${
                        row.val > 50 ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-white/40">
                    {row.val}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FeatureCell>

        {/* Screenshots */}
        <FeatureCell delay={0.08}>
          <FeatureLabel icon={Camera}>Screenshots</FeatureLabel>
          <FeatureTitle>Charts that tell the story.</FeatureTitle>
          <FeatureDesc>
            Drag, drop, annotate. Every trade keeps its visual record.
          </FeatureDesc>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02] p-2"
              >
                <svg viewBox="0 0 60 60" className="h-full w-full">
                  <path
                    d={
                      i === 0
                        ? "M 5 50 L 15 40 L 25 45 L 35 25 L 45 30 L 55 15"
                        : i === 1
                        ? "M 5 30 L 15 35 L 25 20 L 35 28 L 45 18 L 55 22"
                        : "M 5 40 L 15 45 L 25 38 L 35 42 L 45 30 L 55 35"
                    }
                    fill="none"
                    stroke="rgb(110, 231, 183)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <line x1="0" y1="50" x2="60" y2="50" stroke="white" strokeOpacity="0.05" />
                  <line x1="0" y1="35" x2="60" y2="35" stroke="white" strokeOpacity="0.05" strokeDasharray="2,2" />
                </svg>
              </div>
            ))}
          </div>
        </FeatureCell>

        {/* Strategy */}
        <FeatureCell delay={0.16}>
          <FeatureLabel icon={Compass}>Strategy tracking</FeatureLabel>
          <FeatureTitle>Know which playbook pays.</FeatureTitle>
          <FeatureDesc>
            Track separate strategies side-by-side and see which one is actually carrying your edge.
          </FeatureDesc>

          <div className="mt-5 space-y-1.5">
            {[
              { name: "Continuation NQ", val: "+$8.2k", w: "68%", up: true },
              { name: "Reversal scalp", val: "−$1.1k", w: "42%", up: false },
              { name: "London breakout", val: "+$3.4k", w: "61%", up: true },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-white/[0.02] px-2.5 py-1.5 text-[11.5px]"
              >
                <span className="text-white/70">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white/40">{s.w}</span>
                  <span
                    className={`tabular-nums ${
                      s.up ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {s.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FeatureCell>

        {/* AI insights - wide */}
        <FeatureCell className="md:col-span-2" delay={0.24}>
          <div className="grid gap-6 md:grid-cols-5 md:items-center">
            <div className="md:col-span-2">
              <FeatureLabel icon={Sparkles}>AI insights</FeatureLabel>
              <FeatureTitle>A second pair of eyes that never blinks.</FeatureTitle>
              <FeatureDesc>
                Steady reads your journal and surfaces the patterns you'd miss — the bias, the time-of-day drift, the emotional drawdown.
              </FeatureDesc>
            </div>
            <div className="md:col-span-3">
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-400/15">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  </div>
                  <div className="text-[13px] leading-relaxed text-white/75">
                    Your win rate drops from <span className="text-emerald-300">68% to 31%</span> when you take more than 4 trades in a session. The marginal trades are statistically noise. <span className="text-white/50">— pattern detected over 247 sessions.</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-[11px] text-white/40">
                <span className="rounded-md bg-white/[0.03] px-2 py-1">+ 7 more insights this month</span>
              </div>
            </div>
          </div>
        </FeatureCell>
      </div>

      {/* secondary feature row */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: FileText, title: "Emotional notes", desc: "Capture state, not just price." },
          { icon: TrendingUp, title: "Advanced stats", desc: "Sharpe, expectancy, R-multiple." },
          { icon: Download, title: "Broker imports", desc: "CSV, API, native integrations." },
          { icon: FileText, title: "Performance reports", desc: "Weekly digest, exportable PDF." },
        ].map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 transition-colors hover:border-white/[0.12]"
          >
            <f.icon className="mb-4 h-4 w-4 text-emerald-300/80" strokeWidth={1.6} />
            <div className="text-[14px] font-medium text-white">{f.title}</div>
            <div className="mt-1 text-[12.5px] text-white/45">{f.desc}</div>
          </motion.div>
        ))}
      </div>
    </Container>
  </section>
);

/* -------------------------------------------------------------------------- */
/*                            PSYCHOLOGY SECTION                               */
/* -------------------------------------------------------------------------- */

const PsychologySection = () => {
  const items = [
    { label: "Impulsive behavior", val: "−42%", desc: "trades taken outside your plan" },
    { label: "Emotional patterns", val: "Mapped", desc: "across 30 days of journaling" },
    { label: "Bad habits", val: "Surfaced", desc: "before they become drawdowns" },
    { label: "Discipline", val: "+27 pts", desc: "average score over 90 days" },
  ];

  return (
    <section id="psychology" className="relative overflow-hidden py-28 md:py-36">
      {/* soft glow background */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.05] blur-[140px]" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel accent="Psychology" />
          <Headline className="md:text-[64px]">
            Your strategy may not be<br />
            <span className="italic text-white/60">the real problem.</span>
          </Headline>
          <SubText className="mx-auto mt-6 max-w-xl">
            Most edges leak in the same place — between the alert and the click. Steady gives you a mirror to see exactly where.
          </SubText>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] md:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-[#0a0a0a] p-7"
            >
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40">
                {item.label}
              </div>
              <div
                className="mt-4 font-serif text-[36px] tracking-tight text-white md:text-[42px]"
                style={{ fontFamily: '"Fraunces", Georgia, serif' }}
              >
                {item.val}
              </div>
              <div className="mt-2 text-[12.5px] leading-snug text-white/50">
                {item.desc}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-6 md:flex-row md:justify-center">
          <div className="max-w-md text-center text-[14px] italic leading-relaxed text-white/60 md:text-left">
            "The market doesn't take your money. Your unprocessed habits do. Steady is the processing layer."
          </div>
          <div className="hidden h-10 w-px bg-white/10 md:block" />
          <a
            href="#"
            className="group inline-flex items-center gap-2 text-[13.5px] text-emerald-300 transition-colors hover:text-emerald-200"
          >
            Read the manifesto
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </Container>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                              TESTIMONIALS                                   */
/* -------------------------------------------------------------------------- */

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote:
        "I had been trading for four years before Steady. I thought I had a strategy problem. Turned out I had a 9pm problem — every revenge trade I ever took. Seeing it on paper changed everything.",
      name: "Marcus Lin",
      role: "Futures scalper · NQ",
      stat: "+38% in 90 days",
    },
    {
      quote:
        "The discipline score is the only metric I look at on Friday now. P&L is downstream of it. I stopped tracking returns and my returns went up.",
      name: "Sofia Vasquez",
      role: "Crypto perp trader · Hyperliquid",
      stat: "Win rate 47% → 62%",
    },
    {
      quote:
        "Other journals felt like spreadsheets that judged me. Steady feels like a mentor who's read every trade I've ever made and just shows me the pattern.",
      name: "James Okafor",
      role: "Equity swing trader",
      stat: "Drawdown halved",
    },
  ];

  return (
    <section id="customers" className="relative py-28 md:py-36">
      <Container>
        <div className="mb-16 grid gap-10 md:grid-cols-2 md:items-end">
          <div>
            <SectionLabel accent="Customers" />
            <Headline>Words from traders<br />who stayed.</Headline>
          </div>
          <SubText className="md:max-w-md md:justify-self-end">
            We don't pay for testimonials. These are the ones who stuck around past day 90 — and told us why.
          </SubText>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.03] to-transparent p-7"
            >
              <Quote
                className="mb-5 h-5 w-5 text-emerald-400/50"
                strokeWidth={1.5}
              />
              <p className="flex-1 text-[14.5px] leading-relaxed text-white/75">
                {t.quote}
              </p>

              <div className="mt-7 border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-medium text-white">
                      {t.name}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-white/40">
                      {t.role}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-white/30">
                      Result
                    </div>
                    <div className="mt-0.5 text-[12px] text-emerald-300">
                      {t.stat}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 PRICING                                     */
/* -------------------------------------------------------------------------- */

const PricingSection = () => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Free",
      desc: "Everything you need to start journaling seriously.",
      price: { monthly: 0, annual: 0 },
      cta: "Start free",
      highlight: false,
      features: [
        "Unlimited trades",
        "30 days of history",
        "Core analytics",
        "1 strategy profile",
        "CSV import",
      ],
      excluded: ["AI insights", "Unlimited history", "Discipline score", "Custom reports"],
    },
    {
      name: "Pro",
      desc: "For traders treating their craft as a career.",
      price: { monthly: 24, annual: 19 },
      cta: "Start 14-day trial",
      highlight: true,
      features: [
        "Everything in Free",
        "Unlimited history",
        "AI insights & pattern detection",
        "Discipline score",
        "Unlimited strategies",
        "Native broker integrations",
        "Weekly performance reports",
        "Priority support",
      ],
      excluded: [],
    },
  ];

  return (
    <section id="pricing" className="relative py-28 md:py-36">
      <Container>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <SectionLabel accent="Pricing" />
          <Headline>Simple. Honest. Fair.</Headline>
          <SubText className="mx-auto mt-6 max-w-md">
            Start free. Upgrade when the journal earns its keep.
          </SubText>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.02] p-1 text-[12.5px]">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                !annual ? "bg-white text-black" : "text-white/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative rounded-full px-4 py-1.5 transition-colors ${
                annual ? "bg-white text-black" : "text-white/60"
              }`}
            >
              Annual
              <span className="ml-1.5 text-[10px] text-emerald-500">−20%</span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className={`relative overflow-hidden rounded-2xl p-7 ${
                plan.highlight
                  ? "border border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent"
                  : "border border-white/[0.07] bg-white/[0.015]"
              }`}
            >
              {plan.highlight && (
                <>
                  <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                  <div className="absolute right-5 top-5 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                    Recommended
                  </div>
                </>
              )}

              <div className="relative">
                <h3
                  className="text-[24px] tracking-tight text-white"
                  style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                >
                  {plan.name}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {plan.desc}
                </p>

                <div className="mt-7 flex items-baseline gap-1.5">
                  <span
                    className="font-serif text-[52px] leading-none tracking-tight text-white"
                    style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                  >
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-[13px] text-white/40">
                    {plan.price.monthly === 0 ? "forever" : "/month"}
                  </span>
                </div>
                {plan.price.monthly > 0 && annual && (
                  <div className="mt-1 text-[11.5px] text-white/35">
                    billed annually · ${plan.price.annual * 12}
                  </div>
                )}

                <a
                  href="#"
                  className={`mt-7 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-medium transition-all ${
                    plan.highlight
                      ? "bg-white text-black hover:bg-white/90"
                      : "border border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>

                <div className="mt-7 space-y-3">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2.5 text-[13px]">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          plan.highlight ? "text-emerald-300" : "text-white/60"
                        }`}
                        strokeWidth={2.5}
                      />
                      <span className="text-white/75">{f}</span>
                    </div>
                  ))}
                  {plan.excluded.map((f, j) => (
                    <div
                      key={j}
                      className="flex items-start gap-2.5 text-[13px] text-white/30"
                    >
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                      <span className="line-through">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-white/40">
          Cancel any time. No questions, no friction.
        </p>
      </Container>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 FINAL CTA                                   */
/* -------------------------------------------------------------------------- */

const FinalCTA = () => (
  <section className="relative overflow-hidden py-28 md:py-36">
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.08] blur-[120px]" />

    <Container className="relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-10 text-center md:p-20"
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
            }}
          />
        </div>

        <div className="relative">
          <Moon className="mx-auto mb-7 h-7 w-7 text-emerald-300/70" strokeWidth={1.4} />
          <h2
            className="mx-auto max-w-3xl text-balance text-[40px] font-medium leading-[1.02] tracking-[-0.025em] text-white md:text-[64px]"
            style={{ fontFamily: '"Fraunces", Georgia, serif' }}
          >
            Trade with more discipline.<br />
            <span className="italic text-white/60">Improve with intention.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-white/55">
            The next trade is in front of you. Make sure the lessons of the last one are too.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="#"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[14px] font-medium text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] transition-all hover:shadow-[0_10px_60px_-10px_rgba(255,255,255,0.7)]"
            >
              Start your journal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-[14px] font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]"
            >
              See pricing
            </a>
          </div>
        </div>
      </motion.div>
    </Container>
  </section>
);

/* -------------------------------------------------------------------------- */
/*                                  FOOTER                                     */
/* -------------------------------------------------------------------------- */

const Footer = () => (
  <footer className="relative border-t border-white/[0.06] py-16">
    <Container>
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-300 to-emerald-500">
              <CircleDot className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span
              className="text-[18px] font-semibold tracking-tight text-white"
              style={{ fontFamily: '"Fraunces", Georgia, serif' }}
            >
              Steady
            </span>
          </a>
          <p className="mt-5 max-w-xs text-[13.5px] leading-relaxed text-white/45">
            The trading journal for traders who want to stay in the game long enough to win it.
          </p>
          <div className="mt-7 flex gap-3">
            {[Twitter, Github, Mail].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40 transition-colors hover:border-white/15 hover:text-white"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 md:col-span-7 md:grid-cols-3">
          {[
            {
              title: "Product",
              links: ["Features", "Pricing", "Changelog", "Integrations", "Roadmap"],
            },
            {
              title: "Resources",
              links: ["Manifesto", "Trader's blog", "Help center", "Templates", "API"],
            },
            {
              title: "Company",
              links: ["About", "Careers", "Privacy", "Terms", "Contact"],
            },
          ].map((col, i) => (
            <div key={i}>
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a
                      href="#"
                      className="text-[13px] text-white/55 transition-colors hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 md:flex-row">
        <div className="text-[12px] text-white/30">
          © {new Date().getFullYear()} Steady. Trade like a craftsman.
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-white/30">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          All systems operational
        </div>
      </div>
    </Container>
  </footer>
);

/* -------------------------------------------------------------------------- */
/*                                    PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function SteadyLanding() {
  return (
    <div
      className="relative min-h-screen bg-[#070707] text-white antialiased selection:bg-emerald-300/30 selection:text-white"
      style={{ fontFamily: '"Inter Tight", system-ui, sans-serif' }}
    >
      {/* font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter+Tight:wght@300;400;500;600;700&display=swap');
        html { scroll-behavior: smooth; }
        body { background: #070707; }
      `}</style>

      <Nav />
      <main>
        <Hero />
        <SocialStrip />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <PsychologySection />
        <TestimonialsSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
