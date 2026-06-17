/**
 * /api/polymarket/market-history — proxy for the CLOB prices-history
 * endpoint. Returns a clean time series for sparklines + chart on the
 * detail view.
 *
 * Why proxy? The CLOB endpoint is on a different origin from Polymarket
 * Gamma — proxying keeps the client to single-origin fetches, plus we
 * get edge caching so multiple panels can share one fetch per interval.
 */

type Env = Record<string, unknown>;

const CLOB_API = "https://clob.polymarket.com";
/** History changes slowly; 5min is generous and keeps the sparkline
 *  consistent across panel remounts. */
const REVALIDATE_SECONDS = 300;

const ALLOWED_INTERVALS = new Set(["1h", "6h", "1d", "1w", "1m", "max"]);

type ClobHistory = {
  history?: Array<{ t: number; p: number }>;
};

export type MarketHistoryPoint = {
  /** Milliseconds since epoch (already converted from upstream seconds). */
  t: number;
  /** Price 0-1. */
  p: number;
};

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.trim();
    const intervalParam = url.searchParams.get("interval")?.trim() ?? "1w";
    const interval = ALLOWED_INTERVALS.has(intervalParam)
      ? intervalParam
      : "1w";
    if (!token) {
      return Response.json({ history: [], error: "missing token" }, { status: 400 });
    }

    const apiUrl = new URL(`${CLOB_API}/prices-history`);
    apiUrl.searchParams.set("market", token);
    apiUrl.searchParams.set("interval", interval);
    apiUrl.searchParams.set("fidelity", "720");

    const res = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) {
      return Response.json(
        { history: [], error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as ClobHistory;
    const history: MarketHistoryPoint[] = (data.history ?? []).map((pt) => ({
      t: pt.t * 1000,
      p: pt.p,
    }));

    return Response.json({ history });
  } catch (err) {
    return Response.json(
      {
        history: [],
        error: err instanceof Error ? err.message : "fetch failed",
      },
      { status: 500 },
    );
  }
};
