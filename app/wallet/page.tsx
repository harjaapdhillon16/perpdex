"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import WalletButton from "@/components/wallet/WalletButton";

type WalletApiResponse = {
  address: string | null;
  balances: {
    sol: number | null;
    collateral?: number | null;
  };
  network: {
    cluster: string;
    rpcUrl: string;
    rpcStatus: "healthy" | "degraded" | "unknown";
    lastSync: string;
  };
  error?: string;
};

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(value: number | null, decimals = 4) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(decimals);
}

export default function WalletPage() {
  const { publicKey, connected, wallet } = useWallet();
  const [walletData, setWalletData] = useState<WalletApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const address = publicKey?.toBase58() ?? null;

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const url = address ? `/api/wallet?wallet=${address}` : "/api/wallet";
      const response = await fetch(url);
      const data = (await response.json()) as WalletApiResponse;
      setWalletData(data);
    } catch {
      setWalletData(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const displayAddress = useMemo(() => {
    if (!address) return "--";
    return shortenAddress(address);
  }, [address]);

  const handleCopy = async () => {
    if (!address || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("idle");
    }
  };

  const network = walletData?.network;
  const balance = walletData?.balances?.sol ?? null;
  const collateral = walletData?.balances?.collateral ?? null;

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
                {network?.cluster ?? "Network"}
              </span>
              <WalletButton />
            </div>
          </div>
          
          <nav className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm">
            <Link href="/dashboard" className="text-gray-400 transition-colors hover:text-white">
              Dashboard
            </Link>
            <Link href="/wallet" className="text-white">
              Wallet
            </Link>
            <Link href="/docs" className="ml-auto text-gray-400 transition-colors hover:text-white">
              Docs
            </Link>
          </nav>
        </header>

        {/* Error Display */}
        {walletData?.error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
            {walletData.error}
          </div>
        ) : null}

        {/* Main Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Wallet Identity Card */}
          <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-8 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400">
                <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Wallet Identity</p>
                <h2 className="text-xl font-bold text-white">Connected Wallet</h2>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Address</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className="text-2xl font-mono font-bold text-white">{displayAddress}</p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!address}
                    className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {copyState === "copied" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border border-gray-800 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Provider</span>
                  <span className="font-semibold text-white">{wallet?.adapter?.name ?? "--"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className={`flex items-center gap-2 font-semibold ${connected ? "text-emerald-400" : "text-red-400"}`}>
                    <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"} ${connected ? "animate-pulse" : ""}`}></span>
                    {connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Balances Card */}
          <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-8 backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400">
                  <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">Balances</p>
                  <h2 className="text-xl font-bold text-white">Assets</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchWalletData}
                disabled={loading}
                className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "Syncing..." : "Refresh"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-black/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">SOL Balance</p>
                    <p className="mt-2 text-3xl font-bold text-white">{formatNumber(balance)}</p>
                    <p className="mt-1 text-sm text-gray-400">SOL</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-400/20">
                    <span className="text-2xl">◎</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-black/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">Collateral</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {collateral !== null ? formatNumber(collateral) : "--"}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">USDC</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-400/20">
                    <span className="text-2xl">$</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Network Status Card - Full Width */}
          <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-8 backdrop-blur-sm lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-400">
                <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Network Status</p>
                <h2 className="text-xl font-bold text-white">Solana Network</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-black/30 p-6">
                <p className="text-xs uppercase tracking-wider text-gray-400">Cluster</p>
                <p className="mt-3 text-2xl font-bold text-white">{network?.cluster ?? "--"}</p>
              </div>
              
              <div className="rounded-xl border border-gray-800 bg-black/30 p-6">
                <p className="text-xs uppercase tracking-wider text-gray-400">RPC Status</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${
                    network?.rpcStatus === 'healthy' ? 'bg-emerald-400' :
                    network?.rpcStatus === 'degraded' ? 'bg-amber-400' :
                    'bg-gray-600'
                  } ${network?.rpcStatus === 'healthy' ? 'animate-pulse' : ''}`}></span>
                  <p className="text-2xl font-bold capitalize text-white">
                    {network?.rpcStatus ?? "unknown"}
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl border border-gray-800 bg-black/30 p-6">
                <p className="text-xs uppercase tracking-wider text-gray-400">Last Sync</p>
                <p className="mt-3 text-2xl font-bold text-white">
                  {network?.lastSync
                    ? new Date(network.lastSync).toLocaleTimeString()
                    : "--"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-800 bg-black/30 px-4 py-3">
              <p className="text-xs text-gray-400">
                RPC Endpoint: <span className="font-mono text-gray-300">{network?.rpcUrl ?? "--"}</span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}