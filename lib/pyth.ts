import { PublicKey } from "@solana/web3.js";

const feeds = {
  ETH: process.env.PYTH_ETH_FEED ?? "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw",
  SOL: process.env.PYTH_SOL_FEED ?? "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"
};

export function getFeedKey(market: string): PublicKey | null {
  const key = feeds[market as keyof typeof feeds];
  if (!key) return null;
  return new PublicKey(key);
}

export const SUPPORTED_MARKETS = Object.keys(feeds);
