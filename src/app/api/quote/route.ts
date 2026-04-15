import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDepositQuote } from "@/lib/lifi/earn-client";

interface QuoteRequest {
  fromChain: string;
  toChain: string;
  fromToken: string;
  vaultAddress: string;
  fromAmount: string;
  userAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    const { fromChain, toChain, fromToken, vaultAddress, fromAmount, userAddress } = body;

    if (!fromChain || !fromToken || !vaultAddress || !fromAmount || !userAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const quote = await getDepositQuote(
      fromChain,
      toChain || fromChain,
      fromToken,
      vaultAddress,
      fromAmount,
      userAddress
    );

    if (quote.message || quote.error) {
      return NextResponse.json(
        { error: quote.message || quote.error || "Quote failed" },
        { status: 502 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quote failed:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}
