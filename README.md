# Steady — Hyperliquid Trading Analytics

Read-only analytics for Hyperliquid traders. No wallet connection required.

**Live:** https://steadytrade.org

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| i18n | next-intl v4 |
| Database / Cache | Supabase (PostgreSQL) |
| Data source | Hyperliquid public API |
| Hosting | Vercel |

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Internationalization (i18n)

### Routing

| URL | Locale |
|-----|--------|
| `/` | English (default) |
| `/fr/...` | French |

Powered by `next-intl` with `localePrefix: "as-needed"`.

France IPs are auto-redirected to `/fr` on first visit (via `x-vercel-ip-country` header). The choice is persisted in a `NEXT_LOCALE` cookie.

### Adding or editing translations

**Every user-visible string must go through `t()` and have a key in both JSON files.**

```
messages/
  en.json   ← source of truth (English)
  fr.json   ← French translations
```

Translation files are namespaced:

```json
{
  "HomePage": { ... },
  "TraderPage": { ... },
  "Cards": {
    "StatGrid": { ... },
    "Revenge": { ... },
    "Streak": { ... },
    "Hourly": { ... },
    "Direction": { ... },
    "RR": { ... },
    "TPSL": { ... },
    "RecentWR": { ... },
    "Leverage": { ... },
    "Weekday": { ... },
    "HoldTime": { ... },
    "Funding": { ... },
    "BuyHold": { ... }
  }
}
```

### Convention — mandatory checklist

When adding any text visible to the user:

1. **Add the key in `messages/en.json` first** (English is the source of truth).
2. **Add the French translation in `messages/fr.json`** under the same key path.
3. **Use `useTranslations("Namespace")` in the component** and call `t("key")`.
4. **Use ICU interpolation for dynamic values**: `t("greeting", { name: "Alice" })` → message: `"Hello {name}!"`.
5. **Never inline a visible string** in JSX — the ESLint rule `i18next/no-literal-string` will warn if you do.

```tsx
// ✅ Correct
const t = useTranslations("Cards.Revenge");
<p>{t("noRevenge")}</p>

// ❌ Wrong — triggers ESLint warning
<p>No revenge trades detected.</p>
```

### Fallback behaviour

If a key is present in `en.json` but missing in `fr.json`, next-intl automatically falls back to the English string instead of showing a raw key. Fix the missing FR key as soon as possible.

---

## Linting

```bash
npm run lint
```

The `i18next/no-literal-string` rule (warn level) catches hardcoded visible strings before they reach production. Fix warnings before merging.

---

## Architecture

```
app/
  [locale]/             ← locale-aware routes (EN at /, FR at /fr)
    page.tsx            ← Home — address input + dashboard
    layout.tsx          ← NextIntlClientProvider wrapper
    trader/[address]/
      page.tsx          ← Public trader profile (SSR + SEO)
      TraderClient.tsx  ← Client dashboard with compare feature
    legal/              ← Legal pages (disclaimer, privacy, terms, mentions)
  api/sync/route.ts     ← POST /api/sync — fetch + compute + cache
  layout.tsx            ← Root layout (html/body, SpeedInsights)

components/
  dashboard/            ← All insight cards (one file per card)
  ui/                   ← shadcn/ui primitives
  Footer.tsx
  LanguageSwitcher.tsx

lib/
  insights/             ← Pure functions: one file per metric
  api-types.ts          ← Shared types + SCHEMA_VERSION
  db-cache.ts           ← Supabase cache read/write
  format.ts             ← fmtPnl, fmtPct, fmtDuration, …

i18n/
  routing.ts            ← defineRouting (locales, prefix strategy)
  request.ts            ← getRequestConfig + EN fallback

messages/
  en.json               ← English strings (source of truth)
  fr.json               ← French strings

middleware.ts           ← next-intl routing + FR IP auto-redirect
```

### Cache & schema versioning

API responses are cached in Supabase for 5 minutes, keyed by `(address, days_back, schema_version)`. **When adding a new insight field, bump `SCHEMA_VERSION` in `lib/api-types.ts`** to invalidate stale cache entries.

---

## Adding a new insight card

1. Create `lib/insights/mymetric.ts` — export the interface and a pure compute function.
2. Add the interface to `SyncData.insights` in `lib/api-types.ts` and bump `SCHEMA_VERSION`.
3. Call the compute function in `app/api/sync/route.ts`.
4. Create `components/dashboard/MyMetricCard.tsx` using `useTranslations("Cards.MyMetric")`.
5. Add translation keys to `messages/en.json` and `messages/fr.json`.
6. Import and render the card in `app/[locale]/page.tsx` and `app/[locale]/trader/[address]/TraderClient.tsx`.
