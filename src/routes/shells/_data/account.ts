/**
 * Account / wallet / usage / nav seed data. Pulled out of mocks.ts so
 * PortfolioPanel + MarketHeader don't have to load market+chat data
 * alongside.
 */
import type { UsageData, Wallet } from "../_types";

export const NAV_SECTIONS = [
  { label: "Home", href: "/" },
  { label: "Shells", href: "/shells" },
  { label: "OpenClaw", href: "/openclaw" },
  { label: "Paths", href: "/paths" },
];

export const CURRENT_SECTION = "Shells";
export const WALLET_ADDRESS = "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2";

export const WALLETS: Wallet[] = [
  {
    id: "w1",
    name: "warm-seeking-fox",
    address: "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2",
    primary: true,
  },
  {
    id: "w2",
    name: "quiet-mountain-bear",
    address: "0x7b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f89a0b1c2",
  },
  {
    id: "w3",
    name: "cold-evening-wolf",
    address: "0x4f2e1a3b5c7d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
  },
];

export const MOCK_USAGE: UsageData = {
  sessionDuration: "12m",
  cpu: { percent: 18 },
  ram: { used: 1.2, total: 4.0 },
  tokens: { used: 12_400, total: 100_000 },
  costUsd: 0.06,
};
