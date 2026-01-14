import { NextResponse } from "next/server";

import { fetchOraclePrice, fetchOraclePriceByKey } from "@/lib/oracle";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oracleKey = searchParams.get("oracle");
    const market = (searchParams.get("market") ?? "ETH").toUpperCase();

    const oracle = oracleKey
      ? await fetchOraclePriceByKey(oracleKey, market)
      : await fetchOraclePrice(market);
    return NextResponse.json(oracle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
