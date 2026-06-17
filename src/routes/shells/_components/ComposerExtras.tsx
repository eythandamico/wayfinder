"use client";

import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractTicker,
  matchSlashCommands,
  type SlashCommand,
  type TickerData,
} from "../_data/tickers";
import { TokenLogo } from "./TokenLogo";

type Props = {
  draft: string;
  /** Optional — when provided, the slash-command suggestions are clickable. */
  onPickCommand?: (command: SlashCommand) => void;
};

/**
 * Augments any chat composer with two contextual surfaces, rendered
 * directly above the input pill:
 *
 *   - `/cmd` typed → a small slash-command menu pops up (Slack-style)
 *   - `$TICKER` typed anywhere in the draft → a live preview chip with
 *     the token logo, price, and 24h change appears, hinting that
 *     pressing send will materialize a trading card.
 *
 * Both surfaces use `animate-in` for a soft entry. Slash mode takes
 * precedence — if the draft starts with `/`, the ticker preview is
 * suppressed.
 */
export function ComposerExtras({ draft, onPickCommand }: Props) {
  const slashMatches = matchSlashCommands(draft);
  const ticker = slashMatches.length === 0 ? extractTicker(draft) : null;

  if (slashMatches.length > 0) {
    return <SlashMenu commands={slashMatches} onPick={onPickCommand} />;
  }
  if (ticker) {
    return <TickerPreview ticker={ticker} />;
  }
  return null;
}

function TickerPreview({ ticker }: { ticker: TickerData }) {
  const up = ticker.change24h >= 0;
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-1 p-2.5 ring-1 ring-inset ring-white/[0.06] animate-in fade-in slide-in-from-bottom-1 duration-150">
      <TokenLogo
        symbol={ticker.ticker}
        char={ticker.iconChar}
        bg={ticker.iconBg}
        fg={ticker.iconFg ?? "#fff"}
        size={32}
        kind={ticker.kind}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold leading-none text-foreground">
          ${ticker.ticker}
        </span>
        <span className="truncate text-caption leading-none text-muted-foreground">
          {ticker.name}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-body font-semibold leading-none tabular-nums text-foreground">
          {ticker.kind === "stock"
            ? `$${ticker.price.toFixed(2)}`
            : `$${ticker.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </span>
        <span
          className={cn(
            "text-caption leading-none tabular-nums",
            up ? "text-primary" : "text-tone-down",
          )}
        >
          {up ? "▲" : "▼"} {Math.abs(ticker.change24h).toFixed(2)}%
        </span>
      </div>
      <span className="ml-1 shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-micro uppercase tracking-wider text-primary">
        Send → card
      </span>
    </div>
  );
}

function SlashMenu({
  commands,
  onPick,
}: {
  commands: SlashCommand[];
  onPick?: (cmd: SlashCommand) => void;
}) {
  return (
    <div className="mb-2 overflow-hidden rounded-xl bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-micro uppercase tracking-wider text-muted-foreground">
          <Terminal strokeWidth={1.75} className="size-3" aria-hidden />
          Commands
        </span>
        <span className="text-micro text-muted-foreground/70">
          {commands.length} match{commands.length === 1 ? "" : "es"}
        </span>
      </div>
      <ul className="flex flex-col p-1">
        {commands.map((cmd) => (
          <li key={cmd.id}>
            <button
              type="button"
              onClick={() => onPick?.(cmd)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-surface-1"
            >
              <span className="w-16 shrink-0 text-body font-semibold text-primary">
                {cmd.prefix}
              </span>
              <span className="truncate text-body text-muted-foreground">
                {cmd.hint}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
