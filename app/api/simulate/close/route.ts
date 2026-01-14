import { NextResponse } from "next/server";

import { fetchOraclePrice } from "@/lib/oracle";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const market = String(body.market ?? "ETH").toUpperCase();
    const side = String(body.side ?? "long").toLowerCase();
    const margin = Number(body.margin ?? 0);
    const notional = Number(body.notional ?? 0);
    const entryPrice = Number(body.entryPrice ?? 0);

    if (!margin || !notional || !entryPrice) {
      return NextResponse.json(
        { error: "margin, notional, and entryPrice are required" },
        { status: 400 }
      );
    }

    const oracle = await fetchOraclePrice(market);
    const markPrice = oracle.price;
    const baseSize = notional / entryPrice;
    const pnl =
      side === "short"
        ? (entryPrice - markPrice) * baseSize
        : (markPrice - entryPrice) * baseSize;

    const fundingImpact = 0;
    const settlement = margin + pnl - fundingImpact;

    return NextResponse.json({
      market,
      side,
      markPrice,
      pnl,
      fundingImpact,
      settlement,
      oracle
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
