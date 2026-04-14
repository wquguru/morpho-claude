import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { analyzeAllocation } from "@/lib/ai/allocator";
import type { AllocationInput } from "@/types/allocation";

export async function POST(request: NextRequest) {
  const body: AllocationInput = await request.json();

  try {
    const result = await analyzeAllocation(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
