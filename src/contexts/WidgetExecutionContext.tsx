"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface VaultRecommendation {
  vaultAddress: string;
  vaultName: string;
  chainId: number;
  percentage: number;
  amount: string;
  reason: string;
}

interface WidgetExecutionState {
  isOpen: boolean;
  mode: "connect" | "deposit";
  selectedVault: VaultRecommendation | null;
  openForConnect: () => void;
  openForVault: (vault: VaultRecommendation) => void;
  close: () => void;
}

const WidgetExecutionContext = createContext<WidgetExecutionState | null>(null);

export function WidgetExecutionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"connect" | "deposit">("connect");
  const [selectedVault, setSelectedVault] = useState<VaultRecommendation | null>(null);

  const openForConnect = useCallback(() => {
    setMode("connect");
    setSelectedVault(null);
    setIsOpen(true);
  }, []);

  const openForVault = useCallback((vault: VaultRecommendation) => {
    setMode("deposit");
    setSelectedVault(vault);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <WidgetExecutionContext.Provider
      value={{ isOpen, mode, selectedVault, openForConnect, openForVault, close }}
    >
      {children}
    </WidgetExecutionContext.Provider>
  );
}

export function useWidgetExecution() {
  const ctx = useContext(WidgetExecutionContext);
  if (!ctx)
    throw new Error(
      "useWidgetExecution must be used within WidgetExecutionProvider"
    );
  return ctx;
}
