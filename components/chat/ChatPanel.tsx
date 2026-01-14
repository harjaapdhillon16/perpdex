"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  buildClosePositionTransaction,
  buildOpenPositionTransaction
} from "@/lib/perpdexTransactions";
import { MarketSymbol, ORACLE_FEEDS } from "@/lib/perpdex";

type ChatAction = {
  id: string;
  label: string;
  type: "confirm" | "dismiss";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  transaction?: TransactionPayload | null;
};

type ChatResponse = {
  intent?: string;
  explanation?: string;
  requiresConfirmation?: boolean;
  transaction?: TransactionPayload | null;
  error?: string;
};

type TransactionPayload =
  | {
      type: "open_position";
      market: string;
      side: "long" | "short";
      leverage: number;
      marginSol?: number;
      marginUsd?: number;
    }
  | {
      type: "close_position";
      market: string;
    };

const quickPrompts = [
  "Show my positions",
  "Open 3x long SOL with 0.5 SOL",
  "Close my SOL position",
  "What's my liquidation price?"
];

const initialMessages: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    content:
      "AI trading assistant ready. Ask about positions, execute trades, or get market insights."
  }
];

type ChatPanelProps = {
  walletAddress?: string;
  seedMessage?: string | null;
  seedKey?: number | string | null;
};

export default function ChatPanel({ walletAddress, seedMessage, seedKey }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastSeed, setLastSeed] = useState<string | number | null>(null);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();
  const hasWallet = Boolean(walletAddress);

  const resolveMarket = (market?: string): MarketSymbol | null => {
    if (!market) return null;
    const upper = market.toUpperCase() as MarketSymbol;
    return ORACLE_FEEDS[upper] ? upper : null;
  };

  const executeTransaction = useCallback(
    async (payload: TransactionPayload, messageId: string) => {
      if (!publicKey || !sendTransaction || !signTransaction || !signAllTransactions) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Connect a wallet to sign transactions."
          }
        ]);
        return;
      }

      const market = resolveMarket(payload.market);
      if (!market) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Unsupported market. Use SOL or ETH."
          }
        ]);
        return;
      }

      try {
        setIsExecuting(true);
        const walletAdapter = { publicKey, signTransaction, signAllTransactions };
        let transaction: Transaction | null = null;

        if (payload.type === "open_position") {
          let marginSol = payload.marginSol ?? null;
          if (!marginSol && payload.marginUsd) {
            const oracleResponse = await fetch(`/api/oracle?market=${market}`);
            const oracleData = await oracleResponse.json();
            if (!oracleResponse.ok || !oracleData.price) {
              throw new Error("Unable to fetch oracle price for margin conversion.");
            }
            marginSol = payload.marginUsd / oracleData.price;
          }

          if (!marginSol || marginSol <= 0) {
            throw new Error("Margin must be greater than zero.");
          }

          transaction = await buildOpenPositionTransaction(connection, walletAdapter, {
            market,
            side: payload.side,
            leverage: payload.leverage,
            marginSol
          });
        } else {
          transaction = await buildClosePositionTransaction(connection, walletAdapter, {
            market
          });
        }

        if (!transaction) {
          throw new Error("Unable to build transaction.");
        }

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");

        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId ? { ...message, actions: undefined } : message
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `tx-${Date.now()}`,
            role: "assistant",
            content: `Transaction confirmed. Signature: ${signature}`
          }
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send transaction.";
        setMessages((prev) => [
          ...prev,
          {
            id: `tx-error-${Date.now()}`,
            role: "assistant",
            content: message
          }
        ]);
      } finally {
        setIsExecuting(false);
      }
    },
    [connection, publicKey, sendTransaction, signAllTransactions, signTransaction]
  );

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim()
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "Processing request..."
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");

    try {
      setIsLoading(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), wallet: walletAddress ?? null })
      });

      const data = (await response.json()) as ChatResponse;
      const content =
        data.error ??
        data.explanation ??
        "I could not parse that request. Try again with a specific action.";

      const nextMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content,
        transaction: data.transaction ?? null,
        actions: data.requiresConfirmation
          ? [
              { id: `confirm-${assistantId}`, label: "Confirm", type: "confirm" },
              { id: `dismiss-${assistantId}`, label: "Cancel", type: "dismiss" }
            ]
          : undefined
      };

      setMessages((prev) => prev.map((message) => (message.id === assistantId ? nextMessage : message)));
    } catch (error) {
      const content =
        error instanceof Error ? error.message : "Failed to reach chat service.";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content } : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, walletAddress]);

  const handleAction = (action: ChatAction, message: ChatMessage) => {
    if (action.type === "dismiss") {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, actions: undefined } : item
        )
      );
      return;
    }

    if (message.transaction) {
      void executeTransaction(message.transaction, message.id);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}`,
        role: "assistant",
        content: "Confirmation received. No transaction was prepared."
      }
    ]);
  };

  const resolvedSeed = seedKey ?? seedMessage ?? null;

  useEffect(() => {
    if (!seedMessage || resolvedSeed === null || resolvedSeed === lastSeed) return;
    setLastSeed(resolvedSeed);
    sendMessage(seedMessage);
  }, [lastSeed, resolvedSeed, seedMessage, sendMessage]);

  const inputPlaceholder = useMemo(() => {
    if (!hasWallet) {
      return "Connect wallet to execute trades";
    }
    return "Ask me anything...";
  }, [hasWallet]);

  return (
    <div className="flex h-full min-h-[600px] flex-col rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400">
              <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white">AI Assistant</h3>
              <p className="text-xs text-gray-400">
                {hasWallet ? "Ready to trade" : "Wallet required"}
              </p>
            </div>
          </div>
          <div className={`h-2 w-2 rounded-full ${hasWallet ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading || isExecuting}
              className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs text-gray-300 transition-all hover:border-purple-500/30 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              "rounded-xl p-4",
              message.role === "assistant"
                ? "border border-gray-800 bg-black/30"
                : "border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-cyan-500/10"
            )}
          >
            <div className="flex items-center gap-2">
              {message.role === "assistant" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-cyan-400">
                  <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-400">
                  <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {message.role}
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-white">{message.content}</p>
            
            {message.actions && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action, message)}
                    disabled={isExecuting}
                    className={clsx(
                      "rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                      action.type === "confirm"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-600 hover:to-teal-500"
                        : "border border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800",
                      isExecuting && "opacity-60"
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-black/30 p-4">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0ms' }}></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '150ms' }}></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-sm text-gray-400">AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-black/30 p-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading || isExecuting}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={inputPlaceholder}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || isExecuting || !input.trim()}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-all hover:from-purple-600 hover:to-cyan-500 disabled:opacity-50"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          AI-powered trading assistant on Solana
        </p>
      </div>
    </div>
  );
}
