export const allocationOutputSchema = {
  type: "object" as const,
  properties: {
    recommendedAllocation: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          vaultAddress: { type: "string" as const },
          vaultName: { type: "string" as const },
          chainId: { type: "number" as const },
          percentage: { type: "number" as const },
          amount: { type: "string" as const },
          reason: { type: "string" as const },
        },
        required: [
          "vaultAddress",
          "vaultName",
          "chainId",
          "percentage",
          "amount",
          "reason",
        ],
      },
    },
    expectedApyIncrease: { type: "number" as const },
    riskScoreChange: { type: "number" as const },
    estimatedGasCost: { type: "number" as const },
    breakEvenDays: { type: "number" as const },
    recommendation: {
      type: "string" as const,
      enum: ["execute", "hold", "review"],
    },
    aiExplanation: { type: "string" as const },
  },
  required: [
    "recommendedAllocation",
    "expectedApyIncrease",
    "riskScoreChange",
    "estimatedGasCost",
    "breakEvenDays",
    "recommendation",
    "aiExplanation",
  ],
};
