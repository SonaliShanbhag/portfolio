import { NextResponse } from "next/server";
import { optimizeTransactions } from "@/lib/optimize";
import type { CardRates, TransactionInput } from "@/lib/types";

export const runtime = "nodejs";

function isTransaction(x: unknown): x is TransactionInput {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.date === "string" &&
    typeof o.merchant === "string" &&
    typeof o.category === "string" &&
    typeof o.amount === "number" &&
    Number.isFinite(o.amount)
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const { transactions, cards } = body as {
    transactions?: unknown;
    cards?: unknown;
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty transactions array" },
      { status: 400 },
    );
  }

  if (!transactions.every(isTransaction)) {
    return NextResponse.json(
      { error: "Each transaction needs date, merchant, category (strings), and amount (number)" },
      { status: 400 },
    );
  }

  let cardList: CardRates[] | undefined;
  if (cards !== undefined) {
    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: "If provided, cards must be a non-empty array" }, { status: 400 });
    }
    cardList = cards as CardRates[];
  }

  try {
    const result = optimizeTransactions(transactions, cardList);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Optimization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
