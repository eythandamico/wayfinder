"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Market symbol — e.g. "BTC-USDC" or "AAPL". The first segment (split on
   *  `-` or `/`) is used as the ticker for the logo lookup. */
  symbol: string;
  /** Glyph fallback when the registry doesn't carry this token (HYPE, prediction
   *  markets, etc.). Also rendered underneath the image while it loads. */
  char: string;
  /** Background color of the fallback circle. */
  bg: string;
  /** Foreground color of the fallback glyph. */
  fg?: string;
  /** Diameter in pixels. */
  size: number;
  /** "stock" routes to Financial Modeling Prep (real company logos by
   *  ticker), "crypto" routes to the cryptocurrency-icons registry.
   *  Defaults to crypto for back-compat. */
  kind?: "stock" | "crypto";
  className?: string;
};


/**
 * Token logo with a colored-glyph fallback.
 *
 * Tries `spothq/cryptocurrency-icons` via jsDelivr CDN. If the SVG 404s,
 * keeps the colored glyph as the permanent fallback.
 *
 * Used by ContactAvatar (chat strip), CommandBar (market picker), and
 * ChartPanel (market header) so token branding is consistent across the
 * three surfaces.
 */
export function TokenLogo({
  symbol,
  char,
  bg,
  fg = "#fff",
  size,
  kind = "crypto",
  className,
}: Props) {
  // Two-stage fallback chain:
  //   1. Hyperliquid's static asset CDN (same icon HL itself ships in the
  //      order book — works for crypto and tokenized equities alike).
  //   2. Kind-specific public source (cryptocurrency-icons or FMP).
  //   3. The colored character glyph (always rendered underneath).
  const [hlOk, setHlOk] = useState(true);
  const [fallbackOk, setFallbackOk] = useState(true);

  // The first `-`/`/` segment is the asset; the rest is the quote
  // currency (`-USDC`) which we discard. Hyperliquid's catalog uses
  // an `xyz:` prefix for tokenized equities + commodities (e.g.
  // `xyz:CL-USDC` for crude oil) and the bare ticker for native
  // crypto. We preserve that prefix verbatim so the HL coin URL
  // resolves; bare tickers normalize to alphanumerics so symbols
  // like `BTC` and `BTC-USDC` both look up `BTC.svg`.
  const rawSegment = symbol.split(/[-/]/)[0] ?? "";
  const xyzMatch = rawSegment.match(/^xyz:(.+)$/i);
  const tickerCore = (xyzMatch ? xyzMatch[1] : rawSegment)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const isXyz = !!xyzMatch;
  const hlSlug = isXyz ? `xyz:${tickerCore}` : tickerCore;
  const hlUrl = tickerCore
    ? `https://app.hyperliquid.xyz/coins/${hlSlug}.svg`
    : null;

  // Secondary CDN. `xyz:` markets have no good public source so we
  // skip the second hop and let the glyph render through.
  const fallbackUrl =
    kind === "stock"
      ? tickerCore
        ? `https://financialmodelingprep.com/image-stock/${tickerCore}.png`
        : null
      : !isXyz && tickerCore
        ? `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${tickerCore.toLowerCase()}.svg`
        : null;

  const showHl = hlUrl && hlOk;
  const showFallback = !showHl && fallbackUrl && fallbackOk;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-inset ring-black/20",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: char.length > 1 ? size * 0.32 : size * 0.46,
      }}
    >
      {/* Glyph fallback — only visible when neither image source loads. */}
      {!showHl && !showFallback && char}
      {showHl && (
        <img
          src={hlUrl}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setHlOk(false)}
        />
      )}
      {showFallback && (
        <img
          src={fallbackUrl}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFallbackOk(false)}
        />
      )}
    </span>
  );
}
