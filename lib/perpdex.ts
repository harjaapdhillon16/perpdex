import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "HGqW2bHqovHnVqMDsz59TdcXGZi5eEbVWVDuvScDUrEQ"
);

export const ORACLE_FEEDS = {
  SOL: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"),
  ETH: new PublicKey("EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw")
} as const;

export type MarketSymbol = keyof typeof ORACLE_FEEDS;

export const MARKET_SEED = Buffer.from("market");
export const VAULT_SEED = Buffer.from("vault");
export const COLLATERAL_VAULT_SEED = Buffer.from("vault_collateral");
export const POSITION_SEED = Buffer.from("position");

export function getMarketPda(oracle: PublicKey) {
  return PublicKey.findProgramAddressSync([MARKET_SEED, oracle.toBuffer()], PROGRAM_ID);
}

export function getVaultPda(market: PublicKey) {
  return PublicKey.findProgramAddressSync([VAULT_SEED, market.toBuffer()], PROGRAM_ID);
}

export function getCollateralVaultPda(market: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [COLLATERAL_VAULT_SEED, market.toBuffer()],
    PROGRAM_ID
  );
}

export function getPositionPda(market: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function marketSymbolFromOracle(oracle: PublicKey) {
  const oracleKey = oracle.toBase58();
  const entry = Object.entries(ORACLE_FEEDS).find(([, key]) => key.toBase58() === oracleKey);
  return entry?.[0] ?? oracleKey.slice(0, 6);
}
