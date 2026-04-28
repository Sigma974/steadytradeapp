export const HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz/info";

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

export class HLRateLimitError extends Error {
  constructor() {
    super("Hyperliquid API rate limit exceeded (429)");
    this.name = "HLRateLimitError";
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST to the Hyperliquid info API with automatic retry on 429.
 * Retries up to MAX_RETRIES times with exponential backoff (2s, 4s, 8s).
 * Throws HLRateLimitError if all retries are exhausted.
 * Throws a plain Error for other non-2xx status codes.
 */
export async function hlFetch(payload: Record<string, unknown>): Promise<unknown> {
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(HYPERLIQUID_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Disable Next.js fetch caching — we manage caching ourselves via Supabase
      cache: "no-store",
    });

    if (resp.ok) return resp.json();

    if (resp.status === 429) {
      if (attempt === MAX_RETRIES) throw new HLRateLimitError();
      await sleep(delay);
      delay *= 2;
      continue;
    }

    throw new Error(`Hyperliquid API error: ${resp.status}`);
  }

  // Unreachable but satisfies TypeScript exhaustiveness check
  throw new HLRateLimitError();
}
