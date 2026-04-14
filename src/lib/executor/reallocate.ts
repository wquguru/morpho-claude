import { encodeFunctionData, parseUnits, parseAbi } from "viem";
import { getDepositQuote } from "../lifi/earn-client";

export interface ReallocationStep {
  type: "withdraw" | "deposit";
  vaultAddress: string;
  chainId: number;
  amount: string;
  txData: {
    to: string;
    data: string;
    value?: string;
    gasLimit?: string;
  };
}

const erc4626Abi = parseAbi([
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
]);

export async function prepareReallocation(
  userAddress: string,
  currentAllocation: {
    vaultAddress: string;
    chainId: number;
    amount: string;
  }[],
  targetAllocation: {
    vaultAddress: string;
    chainId: number;
    amount: string;
  }[]
): Promise<ReallocationStep[]> {
  const steps: ReallocationStep[] = [];

  // 1. Withdraw steps (direct ERC-4626 redeem)
  for (const current of currentAllocation) {
    const target = targetAllocation.find(
      (t) => t.vaultAddress === current.vaultAddress
    );
    const targetAmount = target ? parseFloat(target.amount) : 0;
    const withdrawAmount = parseFloat(current.amount) - targetAmount;

    if (withdrawAmount > 0) {
      const data = encodeFunctionData({
        abi: erc4626Abi,
        functionName: "redeem",
        args: [
          parseUnits(withdrawAmount.toString(), 18),
          userAddress as `0x${string}`,
          userAddress as `0x${string}`,
        ],
      });

      steps.push({
        type: "withdraw",
        vaultAddress: current.vaultAddress,
        chainId: current.chainId,
        amount: withdrawAmount.toString(),
        txData: { to: current.vaultAddress, data },
      });
    }
  }

  // 2. Deposit steps (via LI.FI Composer GET-based quotes)
  for (const target of targetAllocation) {
    const current = currentAllocation.find(
      (c) => c.vaultAddress === target.vaultAddress
    );
    const currentAmount = current ? parseFloat(current.amount) : 0;
    const depositAmount = parseFloat(target.amount) - currentAmount;

    if (depositAmount > 0) {
      const chainName = target.chainId === 1 ? "eth" : "base";
      const usdcAddress =
        target.chainId === 1
          ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
          : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

      const quote = await getDepositQuote(
        chainName,
        chainName,
        usdcAddress,
        target.vaultAddress,
        parseUnits(depositAmount.toString(), 6).toString(),
        userAddress
      );

      steps.push({
        type: "deposit",
        vaultAddress: target.vaultAddress,
        chainId: target.chainId,
        amount: depositAmount.toString(),
        txData: quote.transactionRequest,
      });
    }
  }

  return steps;
}
