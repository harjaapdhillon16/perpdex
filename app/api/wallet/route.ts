import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { getClusterLabel, getConnection, getRpcEndpoint } from "@/lib/solana";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  const connection = getConnection();
  const rpcUrl = getRpcEndpoint();
  const cluster = getClusterLabel(rpcUrl);

  let address: string | null = null;
  let solBalance: number | null = null;
  let collateralBalance: number | null = null;

  if (wallet) {
    try {
      const pubkey = new PublicKey(wallet);
      address = pubkey.toBase58();
      const lamports = await connection.getBalance(pubkey);
      solBalance = lamports / LAMPORTS_PER_SOL;
    } catch {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }
  }

  let rpcStatus: "healthy" | "degraded" | "unknown" = "unknown";
  try {
    await connection.getLatestBlockhash();
    rpcStatus = "healthy";
  } catch {
    rpcStatus = "degraded";
  }

  return NextResponse.json({
    connected: Boolean(address),
    address,
    balances: {
      sol: solBalance,
      collateral: collateralBalance
    },
    network: {
      cluster,
      rpcUrl,
      rpcStatus,
      lastSync: new Date().toISOString()
    }
  });
}
