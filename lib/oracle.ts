import { parsePriceData } from "@pythnetwork/client";
import { PublicKey } from "@solana/web3.js";

import { getConnection } from "@/lib/solana";
import { getFeedKey } from "@/lib/pyth";

export type OraclePrice = {
  market: string;
  price: number;
  confidence: number;
  publishTime: number;
  status: string | number;
  exponent: number;
  raw: {
    price: number;
    confidence: number;
  };
};

export async function fetchOraclePrice(market: string): Promise<OraclePrice> {
  const feedKey = getFeedKey(market);
  if (!feedKey) {
    throw new Error("Unsupported market");
  }

  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(feedKey);
  if (!accountInfo) {
    throw new Error("Oracle account not found");
  }

  const data = parsePriceData(accountInfo.data);
  const price = data.price * Math.pow(10, data.exponent);
  const confidence = data.confidence * Math.pow(10, data.exponent);

  return {
    market,
    price,
    confidence,
    publishTime: data.publishTime,
    status: data.status,
    exponent: data.exponent,
    raw: {
      price: data.price,
      confidence: data.confidence
    }
  };
}

export async function fetchOraclePriceByKey(
  oracleKey: PublicKey | string,
  marketLabel = "UNKNOWN"
): Promise<OraclePrice> {
  const key = typeof oracleKey === "string" ? new PublicKey(oracleKey) : oracleKey;
  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(key);
  if (!accountInfo) {
    throw new Error("Oracle account not found");
  }

  const data = parsePriceData(accountInfo.data);
  const price = data.price * Math.pow(10, data.exponent);
  const confidence = data.confidence * Math.pow(10, data.exponent);

  return {
    market: marketLabel,
    price,
    confidence,
    publishTime: data.publishTime,
    status: data.status,
    exponent: data.exponent,
    raw: {
      price: data.price,
      confidence: data.confidence
    }
  };
}
