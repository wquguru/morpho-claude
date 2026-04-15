"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWidgetExecution } from "@/contexts/WidgetExecutionContext";
import { useLiFiWidgetEvents } from "@/hooks/useWidgetEvents";
import type { WidgetConfig } from "@lifi/widget";
import { EthereumProvider } from "@lifi/widget-provider-ethereum";

const ethereumProvider = EthereumProvider();

const LiFiWidget = dynamic(
  () => import("@lifi/widget").then((m) => m.LiFiWidget),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] rounded-2xl bg-white/[0.04] animate-pulse" />
    ),
  }
);

export function LiFiWidgetDialog() {
  const { isOpen, mode, selectedVault, close } = useWidgetExecution();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Subscribe to widget events for toast notifications
  useLiFiWidgetEvents();

  const widgetConfig: WidgetConfig = useMemo(() => {
    const base: WidgetConfig = {
      integrator: "morphoclaude",
      appearance: "dark",
      theme: {
        palette: {
          primary: { main: "#f7c2ff" },
          secondary: { main: "#06b6d4" },
          background: {
            default: "#0a0a0f",
            paper: "#14141f",
          },
          text: {
            primary: "#f0f0f5",
            secondary: "rgba(255,255,255,0.5)",
          },
        },
        shape: { borderRadius: 12 },
        container: {
          boxShadow: "none",
          borderRadius: "16px",
        },
      },
      chains: { allow: [1, 8453, 42161] },
      hiddenUI: ["poweredBy"],
      providers: [ethereumProvider],
    };

    if (mode === "deposit" && selectedVault) {
      return {
        ...base,
        subvariant: "custom",
        subvariantOptions: { custom: "deposit" },
        toChain: selectedVault.chainId,
        toToken: selectedVault.vaultAddress,
      };
    }

    return base;
  }, [mode, selectedVault]);

  if (!hydrated || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="sm:max-w-[420px] p-0 bg-[#0a0a0f] border border-white/[0.08] overflow-hidden"
        showCloseButton
      >
        <DialogTitle className="sr-only">
          {mode === "connect" ? "Connect Wallet" : "Execute Deposit"}
        </DialogTitle>
        <LiFiWidget integrator="morphoclaude" config={widgetConfig} />
      </DialogContent>
    </Dialog>
  );
}
