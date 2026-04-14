"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AllocationOutput } from "@/types/allocation";

interface WidgetExecutionState {
  isOpen: boolean;
  mode: "connect" | "deposit";
  allocation: AllocationOutput | null;
  openForConnect: () => void;
  openForDeposit: (allocation: AllocationOutput) => void;
  close: () => void;
}

const WidgetExecutionContext = createContext<WidgetExecutionState | null>(null);

export function WidgetExecutionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"connect" | "deposit">("connect");
  const [allocation, setAllocation] = useState<AllocationOutput | null>(null);

  const openForConnect = useCallback(() => {
    setMode("connect");
    setAllocation(null);
    setIsOpen(true);
  }, []);

  const openForDeposit = useCallback((alloc: AllocationOutput) => {
    setMode("deposit");
    setAllocation(alloc);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <WidgetExecutionContext.Provider
      value={{ isOpen, mode, allocation, openForConnect, openForDeposit, close }}
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
