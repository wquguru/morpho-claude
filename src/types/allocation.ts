export interface AllocationInput {
  userAmount: string;
  riskProfile: "conservative" | "balanced" | "aggressive";
  currentAllocation: {
    vaultAddress: string;
    chainId: number;
    amount: string;
    percentage: number;
  }[];
  gasPriceGwei: number;
}

export interface AllocationOutput {
  recommendedAllocation: {
    vaultAddress: string;
    chainId: number;
    percentage: number;
    amount: string;
    reason: string;
  }[];
  expectedApyIncrease: number;
  riskScoreChange: number;
  estimatedGasCost: number;
  breakEvenDays: number;
  recommendation: "execute" | "hold" | "review";
  aiExplanation: string;
}
