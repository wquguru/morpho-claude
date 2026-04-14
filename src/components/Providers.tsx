"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, base } from "wagmi/chains";
import { useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetExecutionProvider } from "@/contexts/WidgetExecutionContext";
import { LiFiWidgetDialog } from "@/components/LiFiWidgetDialog";

export const wagmiConfig = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
        : undefined
    ),
    [base.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_KEY
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
        : undefined
    ),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WidgetExecutionProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <LiFiWidgetDialog />
        </WidgetExecutionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
