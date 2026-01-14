'use client'
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen max-h-screen overflow-hidden bg-black">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-violet-950/20"></div>
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 lg:px-16">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-white">△ perpdex</div>
        </div>

        <Link
          href="/docs"
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          Docs
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative z-10 grid h-[calc(100vh-200px)] grid-cols-1 gap-8 px-8 lg:grid-cols-2 lg:px-16">
        {/* Left Column */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold leading-tight text-white lg:text-5xl xl:text-8xl">
            Frictionless perp trading on Solana
          </h1>

          {/* Stats */}
          <div className="mt-16 space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-4xl font-bold text-white">&lt;100ms</div>
                <div className="mt-1 text-gray-400">execution latency</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <div className="text-4xl font-bold text-white">$2.4B+</div>
                <div className="mt-1 text-gray-400">total volume traded</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col justify-center">
          <p className="text-lg leading-relaxed text-gray-400 lg:text-xl">
          The first AI-powered perp DEX built for the next generation of traders. Predictive models, instant execution, and zero slippage on Solana's 400ms blocks. Your edge, automated          </p>

          {/* Trading Visualization */}
          <div className="relative mt-12 h-80 overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-sm lg:mt-16">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full" style={{
                backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}></div>
            </div>

            {/* Price Line Chart */}
            <div className="relative h-full">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                {/* Gradient for line */}
                <defs>
                  <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area under curve */}
                <path
                  d="M 0 180 L 100 160 L 200 140 L 300 155 L 400 120 L 500 130 L 600 100 L 700 110 L 800 90 L 800 300 L 0 300 Z"
                  fill="url(#areaGradient)"
                  className="animate-pulse-slow"
                />
                
                {/* Main price line */}
                <path
                  d="M 0 180 L 100 160 L 200 140 L 300 155 L 400 120 L 500 130 L 600 100 L 700 110 L 800 90"
                  fill="none"
                  stroke="url(#priceGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="animate-line-flow"
                />
              </svg>

              {/* Trading Signals */}
              <div className="absolute left-[45%] top-[35%] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-emerald-400">BUY</span>
                <span className="text-xs text-emerald-400">+2.4%</span>
              </div>

              <div className="absolute left-[75%] top-[28%] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-red-400">SELL</span>
                <span className="text-xs text-red-400">+1.8%</span>
              </div>

              {/* Candlesticks */}
              <div className="absolute bottom-8 left-0 right-0 flex items-end justify-around px-4">
                {[
                  { height: '40%', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
                  { height: '55%', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
                  { height: '35%', color: 'bg-red-500', glow: 'shadow-red-500/50' },
                  { height: '50%', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
                  { height: '60%', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
                  { height: '45%', color: 'bg-red-500', glow: 'shadow-red-500/50' },
                  { height: '65%', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
                ].map((candle, i) => (
                  <div
                    key={i}
                    className={`w-2 ${candle.color} ${candle.glow} rounded-t shadow-lg transition-all duration-500 hover:scale-110`}
                    style={{ 
                      height: candle.height,
                      animationDelay: `${i * 100}ms`
                    }}
                  ></div>
                ))}
              </div>

              {/* Live Price Ticker */}
              <div className="absolute right-4 top-4 rounded-lg border border-purple-500/30 bg-black/50 px-4 py-2 backdrop-blur-sm">
                <div className="text-xs text-gray-400">SOL/USDC</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white">$98.42</span>
                  <span className="text-xs text-emerald-400">+3.2%</span>
                </div>
              </div>

              {/* Volume Indicator */}
              <div className="absolute bottom-4 left-4 rounded-lg border border-purple-500/30 bg-black/50 px-4 py-2 backdrop-blur-sm">
                <div className="text-xs text-gray-400">24h Volume</div>
                <div className="mt-1 text-sm font-bold text-white">$847.2M</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 flex justify-center px-8 pb-12">
        <Link
          href="/app"
          className="rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-16 py-4 text-sm font-bold uppercase tracking-[0.3em] text-white shadow-xl shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
        >
          Enter App
        </Link>
      </div>

      <style jsx>{`
        @keyframes line-flow {
          0% {
            stroke-dasharray: 0 2000;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 2000 2000;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 0 2000;
            stroke-dashoffset: -2000;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-line-flow {
          animation: line-flow 4s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </main>
  );
}