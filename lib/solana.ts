import { clusterApiUrl, Connection } from "@solana/web3.js";

const DEFAULT_CLUSTER = "devnet";

export function getRpcEndpoint() {
  return process.env.SOLANA_RPC_URL ?? clusterApiUrl(DEFAULT_CLUSTER);
}

export function getClusterLabel(endpoint = getRpcEndpoint()) {
  const explicit = process.env.SOLANA_CLUSTER;
  if (explicit) {
    return explicit;
  }

  const lower = endpoint.toLowerCase();
  if (lower.includes("devnet")) return "devnet";
  if (lower.includes("testnet")) return "testnet";
  if (lower.includes("mainnet")) return "mainnet-beta";
  return "custom";
}

export function getConnection() {
  return new Connection(getRpcEndpoint(), "confirmed");
}
