Steady — Trading Analytics Platform (Hyperliquid)

Production-grade analytics for perp scalpers. Reconstructs positions from raw fills and surfaces what an exchange PnL page doesn't.

FIFO position reconstruction (partial entries/exits, cost basis, realized vs unrealized)
PnL net of fees and funding
Per-setup, per-session, per-instrument breakdowns
Behavioral execution scoring
Auth, subscription tiers, deployed on Vercel

Stack: Next.js 15 · TypeScript · Supabase/Postgres · Tailwind/shadcn

src/lib/fifo.ts — position reconstruction engine
src/app/dashboard — analytics views
