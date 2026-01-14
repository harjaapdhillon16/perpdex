import { NextResponse } from "next/server";

const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_URL = "https://api.deepseek.com/v1/chat/completions";

type ChatResult = {
  intent: string | null;
  explanation: string;
  requiresConfirmation: boolean;
  transaction: Record<string, unknown> | null;
};

function detectMarket(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("eth")) return "ETH";
  if (lower.includes("sol")) return "SOL";
  return null;
}

function parseNumber(value: string) {
  const cleaned = value.replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLeverage(message: string) {
  const match = message.match(/(\d+(?:\.\d+)?)\s*x/i);
  if (!match) return null;
  return parseNumber(match[1]);
}

function parseMargin(message: string) {
  const usdMatch = message.match(/\$\s*([\d,.]+)/);
  if (usdMatch) {
    const marginUsd = parseNumber(usdMatch[1]);
    return marginUsd ? { marginUsd } : null;
  }

  const solMatch = message.match(/([\d,.]+)\s*sol/i);
  if (solMatch) {
    const marginSol = parseNumber(solMatch[1]);
    return marginSol ? { marginSol } : null;
  }

  const generic = message.match(/with\s+([\d,.]+)/i);
  if (generic) {
    const marginSol = parseNumber(generic[1]);
    return marginSol ? { marginSol } : null;
  }

  return null;
}

function parseSide(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("short")) return "short";
  if (lower.includes("long")) return "long";
  return null;
}

function parseIntent(message: string, hasWallet: boolean): ChatResult | null {
  const lower = message.toLowerCase();
  const market = detectMarket(message) ?? "SOL";

  if (lower.includes("close")) {
    if (!hasWallet) {
      return {
        intent: "close_position",
        explanation: "Connect a wallet so I can prepare the close transaction.",
        requiresConfirmation: false,
        transaction: null
      };
    }
    return {
      intent: "close_position",
      explanation: `I can close your ${market} position. Confirm to proceed.`,
      requiresConfirmation: true,
      transaction: { type: "close_position", market }
    };
  }

  if (lower.includes("open")) {
    const side = parseSide(message);
    const leverage = parseLeverage(message);
    const margin = parseMargin(message);

    if (!hasWallet) {
      return {
        intent: "open_position",
        explanation: "Connect a wallet to open a position.",
        requiresConfirmation: false,
        transaction: null
      };
    }

    if (!side || !leverage || !margin) {
      return {
        intent: "open_position",
        explanation:
          "Share the side, leverage (e.g. 5x), and margin amount so I can prepare the trade.",
        requiresConfirmation: false,
        transaction: null
      };
    }

    return {
      intent: "open_position",
      explanation: `Opening a ${leverage}x ${side} ${market} position. Confirm to proceed.`,
      requiresConfirmation: true,
      transaction: { type: "open_position", market, side, leverage, ...margin }
    };
  }

  if (lower.includes("position")) {
    return {
      intent: "show_positions",
      explanation: "Fetching your open positions now.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("liquidation")) {
    return {
      intent: "show_liquidation",
      explanation: "Liquidation prices use current oracle data and your margin.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("pnl")) {
    return {
      intent: "show_pnl",
      explanation: "PnL is calculated from oracle prices and your entry.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("risk")) {
    return {
      intent: "risk_check",
      explanation:
        "Risk is based on distance to liquidation. Connect a wallet to inspect positions.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  return null;
}

function fallbackResponse(message: string, hasWallet: boolean): ChatResult {
  const lower = message.toLowerCase();
  const market = detectMarket(message);

  if (lower.includes("close")) {
    if (!hasWallet) {
      return {
        intent: "close_position",
        explanation: "Connect a wallet so I can prepare the close transaction.",
        requiresConfirmation: false,
        transaction: null
      };
    }
    return {
      intent: "close_position",
      explanation: `I can close your ${market ?? "open"} position. Confirm to proceed.`,
      requiresConfirmation: true,
      transaction: { type: "close_position", market }
    };
  }

  if (lower.includes("open")) {
    if (!hasWallet) {
      return {
        intent: "open_position",
        explanation: "Connect a wallet to open a position.",
        requiresConfirmation: false,
        transaction: null
      };
    }
    return {
      intent: "open_position",
      explanation:
        "Tell me the market, side, leverage, and margin so I can prepare the trade.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("liquidation")) {
    return {
      intent: "show_liquidation",
      explanation:
        "I can calculate liquidation prices once your positions are loaded from chain.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("pnl")) {
    return {
      intent: "show_pnl",
      explanation: "PnL is calculated from oracle prices and your entry.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("position")) {
    return {
      intent: "show_positions",
      explanation: "Fetching your open positions now.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  if (lower.includes("risk")) {
    return {
      intent: "risk_check",
      explanation:
        "Risk is based on distance to liquidation. Connect a wallet to inspect positions.",
      requiresConfirmation: false,
      transaction: null
    };
  }

  return {
    intent: null,
    explanation: "Ask about positions, risk, or a trade action.",
    requiresConfirmation: false,
    transaction: null
  };
}

function extractJson(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const withoutFence = trimmed.replace(/```json|```/g, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = withoutFence.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let requestMessage = "";
  let hasWallet = false;

  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const wallet = typeof body?.wallet === "string" ? body.wallet : null;
    requestMessage = message;
    hasWallet = Boolean(wallet);

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const parsed = parseIntent(message, hasWallet);
    if (parsed) {
      return NextResponse.json(parsed);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(fallbackResponse(message, hasWallet));
    }

    const systemPrompt = [
      "You are a Solana perp DEX assistant.",
      "Return only JSON with keys: intent, explanation, requiresConfirmation, transaction.",
      "If wallet is missing, set requiresConfirmation=false and ask to connect.",
      "Supported markets: ETH, SOL.",
      `Wallet: ${wallet ?? "none"}.`
    ].join(" ");

    const response = await fetch(process.env.DEEPSEEK_API_URL ?? DEFAULT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(fallbackResponse(message, hasWallet));
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsedJson = extractJson(content);
    if (!parsedJson) {
      return NextResponse.json(fallbackResponse(message, hasWallet));
    }

    const result: ChatResult = {
      intent: typeof parsedJson.intent === "string" ? parsedJson.intent : null,
      explanation:
        typeof parsedJson.explanation === "string"
          ? parsedJson.explanation
          : "I can help with positions, risk, and trade actions.",
      requiresConfirmation: Boolean(parsedJson.requiresConfirmation),
      transaction:
        parsedJson.transaction && typeof parsedJson.transaction === "object"
          ? parsedJson.transaction
          : null
    };

    return NextResponse.json(result);
  } catch (error) {
    if (requestMessage) {
      return NextResponse.json(fallbackResponse(requestMessage, hasWallet));
    }
    return NextResponse.json(
      {
        intent: null,
        explanation: "Chat is temporarily unavailable. Try again in a moment.",
        requiresConfirmation: false,
        transaction: null
      },
      { status: 200 }
    );
  }
}
