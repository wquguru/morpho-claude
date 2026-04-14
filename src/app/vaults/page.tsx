"use client";

import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/useUserPositions";
import { MarketList } from "@/components/MarketList";
import { DEMO_WALLET } from "@/lib/constants";

export default function VaultsPage() {
  const { address: connectedAddress } = useAccount();
  const address = connectedAddress ?? DEMO_WALLET;
  const { positions } = useUserPositions(address);

  const heldVaultAddresses = new Set(
    positions.map((p) => p.address.toLowerCase())
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 pt-24 pb-12 space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white text-glow">Vault Explorer</h1>
        <p className="text-sm text-white/40">
          Browse and compare all available Morpho vaults
        </p>
      </div>
      <MarketList heldAddresses={heldVaultAddresses} />
    </main>
  );
}
