"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import ChatPanel from "@/components/chat/ChatPanel";
import WalletButton from "@/components/wallet/WalletButton";

const riskStyles = {
  safe: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  caution: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-rose-500/10 text-rose-400 border-rose-500/30"
} as const;

type RiskLevel = keyof typeof riskStyles;

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
  riskLevel: RiskLevel;
  riskDistancePct: number;
};

type PositionsResponse = {
  positions: Position[];
  updatedAt: string;
  error?: string;
};

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chatSeed, setChatSeed] = useState<{ message: string; key: number } | null>(
    null
  );

  const walletAddress = publicKey?.toBase58();
  const networkLabel = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "Devnet";
  const walletStatus = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : "Disconnected";

  const loadPositions = useCallback(async () => {
    if (!walletAddress) {
      setPositions([]);
      setLastUpdated(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/positions?wallet=${walletAddress}`);
      const data = (await response.json()) as PositionsResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to load positions.");
      }
      setPositions(data.positions);
      setLastUpdated(data.updatedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load positions.");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  useEffect(() => {
    if (!walletAddress) return undefined;
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, [loadPositions, walletAddress]);

  const handleToggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClose = (asset: string) => {
    setChatSeed({ message: `Close my ${asset} position`, key: Date.now() });
  };

  const headerSubtitle = useMemo(() => {
    if (!walletAddress) {
      return "Connect your wallet to load positions.";
    }
    if (loading) {
      return "Refreshing positions...";
    }
    return lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : "";
  }, [walletAddress, loading, lastUpdated]);

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    const totalPnl = positions.reduce((sum, pos) => sum + pos.pnlUsd, 0);
    const totalNotional = positions.reduce((sum, pos) => sum + pos.notional, 0);
    const avgPnlPct = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + pos.pnlPct, 0) / positions.length 
      : 0;
    
    return { totalPnl, totalNotional, avgPnlPct };
  }, [positions]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-violet-950/20"></div>
      
      {/* Content */}
      <div className="relative z-10 px-6 py-8 lg:px-12">
        {/* Header */}
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="text-2xl font-bold text-white">△ perpdex</div>
            </Link>
            
            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 text-xs text-gray-400 backdrop-blur-sm">
                {walletStatus}
              </span>
              <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 text-xs text-gray-400 backdrop-blur-sm">
                {networkLabel}
              </span>
              <WalletButton />
            </div>
          </div>
          
          <nav className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm">
            <Link href="/dashboard" className="text-white">
              Dashboard
            </Link>
            <Link href="/wallet" className="text-gray-400 transition-colors hover:text-white">
              Wallet
            </Link>
            <Link href="/docs" className="ml-auto text-gray-400 transition-colors hover:text-white">
              Docs
            </Link>
          </nav>
        </header>

        {/* Portfolio Overview */}
        {positions.length > 0 && (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm">
              <div className="text-xs text-gray-400">Total P&L</div>
              <div className={`mt-2 text-3xl font-bold ${portfolioStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioStats.totalPnl >= 0 ? '+' : ''}${portfolioStats.totalPnl.toFixed(2)}
              </div>
              <div className={`mt-1 text-sm ${portfolioStats.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioStats.avgPnlPct >= 0 ? '+' : ''}{portfolioStats.avgPnlPct.toFixed(2)}% avg
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm">
              <div className="text-xs text-gray-400">Total Exposure</div>
              <div className="mt-2 text-3xl font-bold text-white">
                ${portfolioStats.totalNotional.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-gray-400">
                {positions.length} position{positions.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm">
              <div className="text-xs text-gray-400">Portfolio Health</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {positions.every(p => p.riskLevel === 'safe') ? '✓' : '⚠'}
              </div>
              <div className="mt-1 text-sm text-gray-400">
                {positions.filter(p => p.riskLevel === 'safe').length} safe
              </div>
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Positions Section */}
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Open Positions</h2>
                <p className="mt-1 text-sm text-gray-400">{headerSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={loadPositions}
                disabled={loading}
                className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 text-xs text-gray-400 backdrop-blur-sm transition-colors hover:border-purple-500/30 hover:text-white"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            {positions.length === 0 && !loading ? (
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 px-6 py-16 text-center backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                  <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-white">No open positions</p>
                <p className="mt-2 text-sm text-gray-400">Use chat to open your first trade</p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => {
                  const isExpanded = expanded[position.id];
                  const riskStyle = riskStyles[position.riskLevel];
                  const pnlPositive = position.pnlUsd >= 0;
                  const pnlColor = pnlPositive ? "text-emerald-400" : "text-red-400";

                  return (
                    <div 
                      key={position.id} 
                      className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm transition-all hover:border-purple-500/30"
                    >
                      {/* Position Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-white">
                              {position.asset}
                            </h3>
                            <span className={`rounded-lg border px-3 py-1 text-xs font-semibold uppercase ${
                              position.side === 'long' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
                            }`}>
                              {position.side}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-400">
                            ${position.notional.toLocaleString()} notional
                          </p>
                        </div>
                        <span className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase ${riskStyle}`}>
                          {position.riskLevel}
                        </span>
                      </div>

                      {/* P&L and Price Grid */}
                      <div className="mt-6 grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400">Unrealized P&L</p>
                          <p className={`mt-2 text-3xl font-bold ${pnlColor}`}>
                            {position.pnlUsd >= 0 ? "+" : ""}${position.pnlUsd.toFixed(2)}
                          </p>
                          <p className={`mt-1 text-sm ${pnlColor}`}>
                            {position.pnlPct >= 0 ? "+" : ""}{position.pnlPct.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400">Current Price</p>
                          <p className="mt-2 text-2xl font-bold text-white">
                            ${position.currentPrice.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Entry: ${position.entryPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Liquidation Risk Bar */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Liquidation Distance</span>
                          <span className="font-semibold">{position.riskDistancePct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              position.riskDistancePct > 50 
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                                : position.riskDistancePct > 25
                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${Math.min(100, position.riskDistancePct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-6 grid gap-4 rounded-xl border border-gray-800 bg-black/30 p-4 text-sm sm:grid-cols-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Margin Used</span>
                            <span className="font-semibold text-white">${position.margin.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Liquidation Price</span>
                            <span className="font-semibold text-white">${position.liquidationPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleClose(position.asset)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 transition-all hover:bg-red-500/20"
                        >
                          Close Position
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(position.id)}
                          className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Chat Panel */}
          <section className="flex flex-col">
            <ChatPanel
              walletAddress={walletAddress}
              seedMessage={chatSeed?.message}
              seedKey={chatSeed?.key}
            />
          </section>
        </div>
      </div>
    </main>
  );
}