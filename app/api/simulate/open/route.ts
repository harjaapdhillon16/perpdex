import { NextResponse } from "next/server";

import { fetchOraclePrice } from "@/lib/oracle";
import { getMarketRisk } from "@/lib/risk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const market = String(body.market ?? "ETH").toUpperCase();
    const side = String(body.side ?? "long").toLowerCase();
    const margin = Number(body.margin ?? 0);
    const leverage = Number(body.leverage ?? 0);

    if (!margin || !leverage) {
      return NextResponse.json({ error: "margin and leverage are required" }, { status: 400 });
    }

    const risk = getMarketRisk(market);
    if (!risk) {
      return NextResponse.json({ error: "Unsupported market" }, { status: 400 });
    }

    if (leverage > risk.maxLeverage) {
      return NextResponse.json({ error: "Leverage exceeds max" }, { status: 400 });
    }

    const oracle = await fetchOraclePrice(market);
    const effectivePrice =
      side === "short"
        ? oracle.price - oracle.confidence
        : oracle.price + oracle.confidence;

    const notional = margin * leverage;
    const baseSize = notional / effectivePrice;
    const maintenance = notional * risk.maintenanceMargin;

    const liquidationPrice =
      side === "short"
        ? effectivePrice - (maintenance - margin) / baseSize
        : effectivePrice + (maintenance - margin) / baseSize;

    return NextResponse.json({
      market,
      side,
      entryPrice: effectivePrice,
      liquidationPrice,
      maxLoss: margin,
      estimatedFunding: 0,
      notional,
      oracle
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
