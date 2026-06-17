/**
 * Aggregator — re-exports the focused seed files (markets, chat,
 * account) so the dozens of consumers that import from
 * `../_data/mocks` keep working without churn. New code should
 * prefer importing directly from the focused module:
 *
 *   import { MARKETS, metricsForMarket } from "../_data/markets";
 *   import { SAMPLE_JOBS } from "../_data/chat";
 *   import { WALLETS } from "../_data/account";
 *
 * Path-catalog re-export lives here too since /lib/paths is the
 * canonical source.
 */

export { PATHS, PATHS_CATALOG_URL } from "@/lib/paths";

export {
  VENUES,
  MARKETS,
  TIMEFRAMES,
  TV_INTERVAL,
  MARKET_METRICS,
  metricsForMarket,
  orderBookFor,
  ASKS,
  BIDS,
  type OrderRow,
  type OrderBookSnapshot,
} from "./markets";

export {
  SAMPLE_MESSAGES,
  SAMPLE_SESSIONS,
  SAMPLE_JOBS,
  MODEL_PROVIDER,
  MODELS,
} from "./chat";

export {
  NAV_SECTIONS,
  CURRENT_SECTION,
  WALLET_ADDRESS,
  WALLETS,
  MOCK_USAGE,
} from "./account";
