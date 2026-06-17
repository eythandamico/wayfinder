"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { ChartPanel } from "../ChartPanel";
import { ChatPanel } from "../ChatPanel";
import { CreateChartDialog } from "../CreateChartDialog";
import { CustomChartPanel } from "../CustomChartPanel";
import type { CustomChartConfig } from "../CustomChartPanel";
import { ExplorePathsPanel } from "../ExplorePathsPanel";
import { OrderBookPanel } from "../OrderBook";
import { PortfolioMainView } from "../PortfolioSheet";
import { TradePanel } from "../TradePanel";
import {
  usePortfolioSheet,
  useViewMode,
} from "../../_state/shells-context";
import { WALLETS } from "../../_data/mocks";
import { BottomBar } from "./BottomBar";
import { BottomSheet } from "./BottomSheet";
import { MobileMarketBar } from "./MobileMarketBar";
import { MobileTopBar } from "./MobileTopBar";

type Sheet = "chat" | "trade" | "orderbook" | "charts" | null;

export function MobileLayout() {
  const { viewMode } = useViewMode();
  const {
    open: portfolioOpen,
    openPortfolio,
    closePortfolio,
  } = usePortfolioSheet();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [createChartOpen, setCreateChartOpen] = useState(false);
  // Custom charts live in mobile-local state (no LayoutTree on
  // mobile). Plotting from CreateChartDialog appends here and opens
  // the viewer; tapping a row in the charts list opens the same
  // viewer. Production would persist to the same store as the
  // desktop layout tree.
  const [customCharts, setCustomCharts] = useState<CustomChartConfig[]>([]);
  const [viewingChart, setViewingChart] = useState<number | null>(null);
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);
  const close = () => setSheet(null);

  const onPlot = (config: CustomChartConfig) => {
    setCustomCharts((prev) => [...prev, config]);
    setCreateChartOpen(false);
    setViewingChart(customCharts.length);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar />

      {viewMode === "trading" ? (
        <>
          <MobileMarketBar />
          <div className="min-h-0 flex-1 overflow-hidden p-1">
            <ChartPanel tfPosition="below" />
          </div>

          <BottomBar
            onOpenSheet={(s) => setSheet(s)}
            onOpenChat={() => setSheet("chat")}
            onOpenCharts={() => setSheet("charts")}
            onOpenPortfolio={openPortfolio}
            onOpenTrade={() => setSheet("trade")}
          />

          <BottomSheet
            open={sheet === "chat"}
            onOpenChange={(o) => !o && close()}
            heightFraction={1}
          >
            <div className="h-full">
              <ChatPanel />
            </div>
          </BottomSheet>

          {/* Trade — no sheet title; TradePanel has its own active
              market header at the top. */}
          <BottomSheet
            open={sheet === "trade"}
            onOpenChange={(o) => !o && close()}
            heightFraction={0.9}
          >
            <div className="h-full">
              <TradePanel />
            </div>
          </BottomSheet>

          {/* Portfolio — driven by usePortfolioSheet so the wallet
              avatar in the top bar, the BottomBar Portfolio entry,
              and any future surface can all toggle the same sheet.
              Renders the rich MainView (positions, deposit/withdraw
              pills, trading-wallet dialog). MainView has its own
              header so we skip the BottomSheet title. */}
          <BottomSheet
            open={portfolioOpen}
            onOpenChange={(o) => !o && closePortfolio()}
            heightFraction={0.95}
          >
            <div className="flex h-full flex-col">
              <PortfolioMainView
                onOpenSettings={() => {
                  /* settings drill-in is a follow-up; the hide-
                     balances toggle and density picker land in
                     that view */
                }}
                activeWallet={activeWallet}
                setActiveWallet={setActiveWallet}
              />
            </div>
          </BottomSheet>

          <BottomSheet
            open={sheet === "orderbook"}
            onOpenChange={(o) => !o && close()}
            title="Order book"
            heightFraction={0.9}
          >
            <div className="h-full">
              <OrderBookPanel />
            </div>
          </BottomSheet>

          {/* Charts list — shows custom charts + a Create button. */}
          <BottomSheet
            open={sheet === "charts"}
            onOpenChange={(o) => !o && close()}
            title="Charts"
            heightFraction={0.7}
          >
            <ChartsList
              charts={customCharts}
              onCreate={() => {
                close();
                setCreateChartOpen(true);
              }}
              onView={(i) => {
                close();
                setViewingChart(i);
              }}
            />
          </BottomSheet>

          {/* Full-screen viewer for a single custom chart. */}
          {viewingChart !== null && customCharts[viewingChart] && (
            <ChartViewer
              config={customCharts[viewingChart]}
              onBack={() => setViewingChart(null)}
            />
          )}

          {/* Create-chart catalog picker — adapts to BottomSheet on
              mobile via its own isMobile detection. */}
          <CreateChartDialog
            open={createChartOpen}
            onOpenChange={setCreateChartOpen}
            onPlot={onPlot}
          />
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-1">
          <ExplorePathsPanel />
        </div>
      )}

    </div>
  );
}

/** Full-screen overlay that displays one custom chart with a back
 *  button. Same vocabulary as the desktop CustomChartPanel — just
 *  wrapped to cover the viewport. */
function ChartViewer({
  config,
  onBack,
}: {
  config: CustomChartConfig;
  onBack: () => void;
}) {
  // Build a minimal PanelInstance-shaped object so CustomChartPanel
  // can read its config without rest of the layout plumbing.
  const panel = {
    id: "mobile-viewer",
    type: "customChart" as const,
    config: { ...config },
  };
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to charts list"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
        >
          <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden />
        </button>
        <span className="truncate text-body font-semibold text-foreground">
          {config.title}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <CustomChartPanel panel={panel} />
      </div>
    </div>
  );
}

/** List of created charts inside the charts BottomSheet. Empty
 *  state nudges the user toward Create chart. */
function ChartsList({
  charts,
  onCreate,
  onView,
}: {
  charts: CustomChartConfig[];
  onCreate: () => void;
  onView: (index: number) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 px-4 pb-6">
      <button
        type="button"
        onClick={onCreate}
        className="group relative inline-flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.98]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
        />
        <span className="relative inline-flex items-center gap-1.5">
          <Plus strokeWidth={2} className="size-3.5" aria-hidden />
          Create chart
        </span>
      </button>
      {charts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-body text-muted-foreground">
          No charts yet. Plot something with Create chart to keep it here.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.05]">
          {charts.map((c, i) => (
            <li key={`${c.title}-${i}`}>
              <button
                type="button"
                onClick={() => onView(i)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-body font-semibold text-foreground">
                    {c.title}
                  </span>
                  <span className="truncate text-body text-muted-foreground">
                    {c.series.length === 1
                      ? `${c.series[0].metric}${c.series[0].venue ? ` · ${c.series[0].venue}` : ""}`
                      : `${c.series.length} series`}
                    {" · "}
                    {c.timeframe}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
