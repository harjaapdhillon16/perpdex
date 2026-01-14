import { NextResponse } from "next/server";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import idl from "@/lib/idl/perpdex.json";
import { fetchOraclePriceByKey } from "@/lib/oracle";
import { marketSymbolFromOracle, PROGRAM_ID } from "@/lib/perpdex";
import { getConnection } from "@/lib/solana";

export const runtime = "nodejs";

type Position = {
  id: string;
  asset: string;
  side: "long" | "short";
  notional: number;
  entryPrice: number;
  currentPrice: number;
  pnlUsd: number;
  pnlPct: number;
  margin: number;
  liquidationPrice: number;
  riskLevel: "safe" | "caution" | "high";
  riskDistancePct: number;
};

const LAMPORTS_PER_SOL = 1_000_000_000;
const PRICE_SCALE = 1_000_000;

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof (value as anchor.BN).toNumber === "function") {
    try {
      return (value as anchor.BN).toNumber();
    } catch {
      // fall through to string parsing
    }
  }
  const parsed = Number((value as anchor.BN).toString());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSide(value: unknown): "long" | "short" {
  if (!value) return "long";
  if (typeof value === "string") {
    return value.toLowerCase() === "short" ? "short" : "long";
  }
  if (typeof value === "object") {
    if ("short" in (value as Record<string, unknown>)) return "short";
  }
  return "long";
}

function riskFromDistance(distancePct: number) {
  if (distancePct <= 5) return "high";
  if (distancePct <= 12) return "caution";
  return "safe";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const updatedAt = new Date().toISOString();

    if (!wallet) {
      return NextResponse.json({ positions: [], updatedAt });
    }

    let owner: PublicKey;
    try {
      owner = new PublicKey(wallet);
    } catch {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const connection = getConnection();
    const coder = new anchor.BorshAccountsCoder(idl as anchor.Idl);

    const filters = [
      { memcmp: coder.memcmp("Position") },
      {
        memcmp: {
          offset: 8,
          bytes: owner.toBase58()
        }
      }
    ];

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters });
    if (accounts.length === 0) {
      return NextResponse.json({ positions: [], updatedAt });
    }

    const decodedPositions = accounts
      .map((account) => {
        try {
          const data = coder.decode("Position", account.account.data) as Record<string, unknown>;
          return { pubkey: account.pubkey, data };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { pubkey: PublicKey; data: Record<string, unknown> } => Boolean(entry));

    const marketKeys = Array.from(
      new Set(decodedPositions.map((entry) => (entry.data.market as PublicKey).toBase58()))
    ).map((key) => new PublicKey(key));

    const marketAccounts = await connection.getMultipleAccountsInfo(marketKeys);
    const marketMap = new Map<string, Record<string, unknown>>();

    marketAccounts.forEach((info, index) => {
      if (!info) return;
      try {
        const market = coder.decode("Market", info.data) as Record<string, unknown>;
        marketMap.set(marketKeys[index].toBase58(), market);
      } catch {
        // ignore decode failures
      }
    });

    const oracleMap = new Map<string, { price: number; confidence: number }>();
    await Promise.all(
      Array.from(marketMap.values()).map(async (market) => {
        const oracle = market.oracle as PublicKey;
        if (!oracle) return;
        const oracleKey = oracle.toBase58();
        if (oracleMap.has(oracleKey)) return;
        try {
          const data = await fetchOraclePriceByKey(oracle);
          oracleMap.set(oracleKey, { price: data.price, confidence: data.confidence });
        } catch {
          // skip oracle if unavailable
        }
      })
    );

    const positions: Position[] = decodedPositions.map((entry) => {
      const data = entry.data;
      const marketKey = (data.market as PublicKey).toBase58();
      const market = marketMap.get(marketKey);
      const oracle = market?.oracle as PublicKey | undefined;
      const oracleKey = oracle?.toBase58();
      const oracleData = oracleKey ? oracleMap.get(oracleKey) : undefined;

      const side = normalizeSide(data.side);
      const notionalLamports = toNumber(data.notional);
      const marginLamports = toNumber(data.margin);
      const entryPriceUsd = toNumber(data.entry_price) / PRICE_SCALE;
      const currentPriceUsd = oracleData?.price ?? entryPriceUsd;

      const baseSize = entryPriceUsd ? notionalLamports / entryPriceUsd : 0;
      const priceDelta =
        side === "short" ? entryPriceUsd - currentPriceUsd : currentPriceUsd - entryPriceUsd;
      const pnlLamports = baseSize ? priceDelta * baseSize : 0;

      const pnlSol = pnlLamports / LAMPORTS_PER_SOL;
      const pnlUsd = pnlSol * currentPriceUsd;
      const marginSol = marginLamports / LAMPORTS_PER_SOL;
      const marginUsd = marginSol * currentPriceUsd;
      const pnlPct = marginUsd ? (pnlUsd / marginUsd) * 100 : 0;

      const maintenanceBps = toNumber(
        market?.maintenance_margin_bps ?? market?.maintenanceMarginBps,
        800
      );
      const maintenanceLamports = notionalLamports * (maintenanceBps / 10_000);
      const liquidationPriceUsd = baseSize
        ? side === "short"
          ? entryPriceUsd - (maintenanceLamports - marginLamports) / baseSize
          : entryPriceUsd + (maintenanceLamports - marginLamports) / baseSize
        : entryPriceUsd;

      const distance = currentPriceUsd
        ? side === "short"
          ? (liquidationPriceUsd - currentPriceUsd) / currentPriceUsd
          : (currentPriceUsd - liquidationPriceUsd) / currentPriceUsd
        : 0;
      const riskDistancePct = Math.max(0, distance * 100);

      return {
        id: entry.pubkey.toBase58(),
        asset: oracle ? marketSymbolFromOracle(oracle) : "UNKNOWN",
        side,
        notional: notionalLamports ? (notionalLamports / LAMPORTS_PER_SOL) * entryPriceUsd : 0,
        entryPrice: entryPriceUsd,
        currentPrice: currentPriceUsd,
        pnlUsd,
        pnlPct,
        margin: marginUsd,
        liquidationPrice: liquidationPriceUsd,
        riskLevel: riskFromDistance(riskDistancePct),
        riskDistancePct
      };
    });

    return NextResponse.json({ positions, updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load positions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
