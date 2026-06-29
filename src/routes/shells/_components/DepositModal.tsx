"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowLeft,
  Check,
  Copy,
  MoreVertical,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepositModal } from "../_state/shells-context";
import { SearchIcon } from "./icons";

/**
 * Three-step Deposit modal — Select token → Select network → QR &
 * address. Uses the same chrome as the global CommandPalette so
 * tokens, network and deposit all feel like extensions of the
 * familiar search surface: top-anchored sheet, rounded-lg popover
 * with ring + glass blur, inline search input on row 1, pill filter
 * chips, full-width hover rows, and a kbd-hint footer.
 */

type Step = "token" | "network" | "deposit";
type Filter = "all" | "cash" | "crypto";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  usd: number;
  type: "cash" | "crypto";
  iconBg: string;
  iconFg: string;
  glyph: string;
};

type Network = {
  id: string;
  name: string;
  time: string;
  minimum: string;
  iconBg: string;
  glyph: string;
};

const ASSETS: Asset[] = [
  { id: "xrp", name: "XRP", symbol: "XRP", balance: 701.91489, usd: 770.25, type: "crypto", iconBg: "#0f0f0f", iconFg: "#fff", glyph: "✕" },
  { id: "cad", name: "Canadian Dollar", symbol: "CAD", balance: 183.24, usd: 128.93, type: "cash", iconBg: "#dc2626", iconFg: "#fff", glyph: "C$" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", balance: 616.66, usd: 48.47, type: "crypto", iconBg: "#c2a633", iconFg: "#fff", glyph: "Ð" },
  { id: "usdc", name: "USDC", symbol: "USDC", balance: 0.7207, usd: 0.72, type: "crypto", iconBg: "#2775ca", iconFg: "#fff", glyph: "$" },
  { id: "eth", name: "Ethereum", symbol: "ETH", balance: 0.0000647, usd: 0.11, type: "crypto", iconBg: "#627eea", iconFg: "#fff", glyph: "◆" },
  { id: "dot", name: "Polkadot", symbol: "DOT", balance: 0.02962838, usd: 0.03, type: "crypto", iconBg: "#e6007a", iconFg: "#fff", glyph: "●" },
  { id: "usd", name: "US Dollar", symbol: "USD", balance: 0.0016, usd: 0.0016, type: "cash", iconBg: "#16a34a", iconFg: "#fff", glyph: "$" },
  { id: "btc", name: "Bitcoin", symbol: "BTC", balance: 0.0, usd: 0.0, type: "crypto", iconBg: "#f7931a", iconFg: "#fff", glyph: "₿" },
];

const DEFAULT_NETWORKS: Network[] = [
  { id: "ethereum", name: "Ethereum", time: "6 minutes", minimum: "0.004 ETH", iconBg: "#627eea", glyph: "◆" },
  { id: "ink", name: "Ink", time: "3 minutes", minimum: "0.01 ETH", iconBg: "#6364ff", glyph: "ℰ" },
  { id: "arbitrum", name: "Arbitrum One", time: "~ 10 minutes", minimum: "0.01 ETH", iconBg: "#28a0f0", glyph: "▲" },
  { id: "optimism", name: "Optimism", time: "< 20 minutes", minimum: "0.01 ETH", iconBg: "#ff0420", glyph: "◯" },
];

const MOCK_ADDRESS = "0xAddA8428f2B94aEF4188efc5131A7D39178Ac539";

export function DepositModal() {
  const { open, closeDeposit } = useDepositModal();
  const [step, setStep] = useState<Step>("token");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  const reset = () => {
    setStep("token");
    setSelectedAsset(null);
    setSelectedNetwork(null);
  };
  const handleClose = () => {
    closeDeposit();
    // Reset after the close transition so the user doesn't see the
    // modal flash back to step 1 on the way out.
    window.setTimeout(reset, 220);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => (o ? null : handleClose())}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/45 backdrop-blur-md transition-opacity duration-300 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-[12vh] z-[var(--z-modal)] flex w-[min(94vw,640px)] max-h-[min(76vh,720px)] -translate-x-1/2 origin-top flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:-translate-y-2 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-2 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          {step === "token" && (
            <SelectTokenStep
              onClose={handleClose}
              onPick={(asset) => {
                setSelectedAsset(asset);
                setStep("network");
              }}
            />
          )}
          {step === "network" && selectedAsset && (
            <SelectNetworkStep
              asset={selectedAsset}
              onClose={handleClose}
              onBack={() => setStep("token")}
              onPick={(network) => {
                setSelectedNetwork(network);
                setStep("deposit");
              }}
            />
          )}
          {step === "deposit" && selectedAsset && selectedNetwork && (
            <DepositStep
              asset={selectedAsset}
              network={selectedNetwork}
              onClose={handleClose}
              onBack={() => setStep("network")}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Select token                                              */
/* ------------------------------------------------------------------ */

function SelectTokenStep({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (a: Asset) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ASSETS.filter((a) => {
      if (filter !== "all" && a.type !== filter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  const { hasDeposited } = useDepositModal();
  return (
    <>
      <TitleRow title="Deposit" onClose={onClose} />

      {/* First-deposit reward promo — only shown until the user has
       *  funded once. Sits above the search so the value prop is the
       *  first thing the eye lands on. Big "$5" carries the offer;
       *  the body explains the agent-credit unlock. */}
      {!hasDeposited && (
        <div className="flex items-center gap-3 border-b border-white/[0.05] bg-surface-1 px-4 py-3">
          <span
            aria-hidden
            className="font-heading text-display font-semibold leading-none text-primary"
          >
            $5
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-body font-semibold text-foreground">
              $5 in agent credit
            </span>
            <span className="text-caption text-muted-foreground">
              Deposit any amount and we'll credit $5 of token usage to
              your agent. One-time, applied automatically.
            </span>
          </div>
        </div>
      )}

      {/* Search row — flush with the modal, divider below. */}
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          autoFocus
          className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Search assets"
        />
      </div>

      {/* Filter chips — pill row, same chip geometry as the
       *  CommandPalette so both surfaces read as the same control. */}
      <div
        role="tablist"
        aria-label="Filter assets"
        className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-2"
      >
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
        />
        <FilterChip
          active={filter === "cash"}
          onClick={() => setFilter("cash")}
          label="Cash"
        />
        <FilterChip
          active={filter === "crypto"}
          onClick={() => setFilter("crypto")}
          label="Crypto"
        />
      </div>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1.5">
        {filtered.length === 0 ? (
          <EmptyState>No assets match &ldquo;{query}&rdquo;.</EmptyState>
        ) : (
          filtered.map((a) => (
            <AssetRow key={a.id} asset={a} onClick={() => onPick(a)} />
          ))
        )}
      </div>

    </>
  );
}

function AssetRow({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:bg-surface-1"
    >
      <TokenGlyph
        bg={asset.iconBg}
        fg={asset.iconFg}
        glyph={asset.glyph}
        size={28}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {asset.name}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {asset.symbol} {asset.type === "cash" ? "· Cash" : "· Crypto"}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 leading-tight">
        <span className="text-body tabular-nums text-foreground">
          {formatBalance(asset.balance)}{" "}
          <span className="text-muted-foreground">{asset.symbol}</span>
        </span>
        <span className="text-caption tabular-nums text-muted-foreground">
          {formatUsd(asset.usd)} USD
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Select network                                            */
/* ------------------------------------------------------------------ */

function SelectNetworkStep({
  asset,
  onClose,
  onBack,
  onPick,
}: {
  asset: Asset;
  onClose: () => void;
  onBack: () => void;
  onPick: (n: Network) => void;
}) {
  return (
    <>
      <TitleRow
        title="Select a network"
        onClose={onClose}
        onBack={onBack}
      />

      <p className="border-b border-white/[0.05] px-4 py-3 text-body text-muted-foreground">
        Only deposit {asset.symbol} using one of the supported networks
        below. Using an unsupported network will result in the loss of
        your funds.
      </p>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1.5">
        {DEFAULT_NETWORKS.map((n) => (
          <NetworkRow key={n.id} network={n} onClick={() => onPick(n)} />
        ))}
      </div>

    </>
  );
}

function NetworkRow({
  network,
  onClick,
}: {
  network: Network;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:bg-surface-1"
    >
      <TokenGlyph
        bg={network.iconBg}
        fg="#fff"
        glyph={network.glyph}
        size={28}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {network.name}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {network.time} · {network.minimum} minimum
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Deposit (QR + address + details)                          */
/* ------------------------------------------------------------------ */

function DepositStep({
  asset,
  network,
  onClose,
  onBack,
}: {
  asset: Asset;
  network: Network;
  onClose: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { markDeposited } = useDepositModal();
  // Reaching this step (the funded deposit screen with the QR + an
  // address) is our proxy for "they're going to deposit". Mark once
  // on mount — the Earn $5 chip in the top bar disappears, the
  // in-modal promo card stops showing on subsequent opens.
  useEffect(() => {
    markDeposited();
  }, [markDeposited]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silent no-op */
    }
  };

  return (
    <>
      <TitleRow
        title={`Deposit ${asset.symbol}`}
        onClose={onClose}
        onBack={onBack}
      />

      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
        <div className="flex justify-center">
          <QrPlaceholder address={MOCK_ADDRESS} />
        </div>

        <div className="mt-4 text-center text-caption text-muted-foreground">
          {asset.symbol} deposit address
        </div>
        <div className="font-heading mt-1 break-all text-center text-body tabular-nums text-foreground">
          {MOCK_ADDRESS}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-surface-2 px-3 text-body font-medium text-foreground transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {copied ? (
              <Check strokeWidth={2} className="size-4 text-primary" aria-hidden />
            ) : (
              <Copy strokeWidth={1.75} className="size-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            type="button"
            aria-label="More options"
            className="inline-flex size-8 items-center justify-center rounded-md bg-surface-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <MoreVertical strokeWidth={1.75} className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex flex-col">
          <DetailRow label="Network">
            <span className="inline-flex items-center gap-1.5">
              <TokenGlyph
                bg={network.iconBg}
                fg="#fff"
                glyph={network.glyph}
                size={18}
              />
              <span className="text-body text-foreground">{network.name}</span>
            </span>
          </DetailRow>
          <DetailRow label="Fee">
            <span className="tabular-nums text-foreground">
              0 <span className="text-muted-foreground">{asset.symbol}</span>
            </span>
          </DetailRow>
          <DetailRow label="Minimum deposit">
            <span className="tabular-nums text-foreground">
              {network.minimum.split(" ")[0]}{" "}
              <span className="text-muted-foreground">
                {network.minimum.split(" ")[1]}
              </span>
            </span>
          </DetailRow>
          <DetailRow label="Required network confirmations">
            <span className="tabular-nums text-foreground">30</span>
          </DetailRow>
          <DetailRow label="Processing time">
            <span className="text-foreground">{network.time}</span>
          </DetailRow>
        </div>

        <div className="mt-4 rounded-md bg-surface-1 px-3 py-3 ring-1 ring-inset ring-white/[0.05]">
          <p className="text-caption text-muted-foreground">
            <span className="font-semibold text-foreground">
              Only deposit {asset.symbol} from the {network.name} network.
            </span>{" "}
            Deposits of other assets or from other networks will be lost.{" "}
            <a className="text-primary underline-offset-2 hover:underline">
              Learn more
            </a>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-surface-3 text-body font-semibold text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Done
        </button>
      </div>

    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-2.5 last:border-b-0">
      <span className="text-body text-muted-foreground">{label}</span>
      <span className="text-body tabular-nums">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function TitleRow({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
      {onBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden />
        </button>
      )}
      <Dialog.Title className="flex-1 px-1 text-body font-semibold text-foreground">
        {title}
      </Dialog.Title>
      <Dialog.Close
        aria-label="Close"
        onClick={onClose}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X strokeWidth={1.75} className="size-4" aria-hidden />
      </Dialog.Close>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-caption transition-colors duration-150 ease-out",
        active
          ? "bg-primary/15 text-primary"
          : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-body text-muted-foreground">
      {children}
    </div>
  );
}

function TokenGlyph({
  bg,
  fg,
  glyph,
  size,
}: {
  bg: string;
  fg: string;
  glyph: string;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  QR placeholder — deterministic from the address string             */
/* ------------------------------------------------------------------ */

function QrPlaceholder({ address }: { address: string }) {
  const SIZE = 25;
  const cells = useMemo(() => buildQrPattern(address, SIZE), [address]);
  return (
    <div className="rounded-xl bg-white p-3">
      <svg
        role="img"
        aria-label="Deposit address QR"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block size-40"
        shapeRendering="crispEdges"
      >
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill="#000"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

function buildQrPattern(address: string, size: number): boolean[][] {
  let seed = 2166136261;
  for (let i = 0; i < address.length; i++) {
    seed ^= address.charCodeAt(i);
    seed = (seed * 16777619) >>> 0;
  }
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };

  const cells: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells[y][x] = rand() > 0.5;
    }
  }

  const placeFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || y === 0 || x === 6 || y === 6;
        const onInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[oy + y][ox + x] = onBorder || onInner;
      }
    }
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        if (x !== -1 && x !== 7 && y !== -1 && y !== 7) continue;
        const xx = ox + x;
        const yy = oy + y;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        cells[yy][xx] = false;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  return cells;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function formatBalance(v: number): string {
  if (v === 0) return "0.0";
  if (v < 0.0001) return v.toFixed(7);
  if (v < 1) return v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatUsd(v: number): string {
  if (v < 0.01 && v > 0) return v.toFixed(4);
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
