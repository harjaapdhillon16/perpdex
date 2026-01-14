export const MARKET_RISK = {
  ETH: {
    maxLeverage: 10,
    maintenanceMargin: 0.06
  },
  SOL: {
    maxLeverage: 8,
    maintenanceMargin: 0.08
  }
};

export function getMarketRisk(market: string) {
  return MARKET_RISK[market as keyof typeof MARKET_RISK];
}
