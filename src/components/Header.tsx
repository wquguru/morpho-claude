"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWidgetExecution } from "@/contexts/WidgetExecutionContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Vaults", href: "/vaults" },
  { label: "AI Agent", href: "/ai-agent" },
];

export function Header() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { openForConnect } = useWidgetExecution();
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/82 border-b border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <span className="font-mono font-bold text-sm text-white/90 tracking-tight">MC</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Morpho<span className="text-white/50">Claude</span>
            </span>
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.16em] rounded-lg bg-[var(--pink)]/10 border border-[var(--pink)]/30 px-2.5 py-1.5 text-[var(--pink)]">
              Yield
            </span>
          </Link>
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* Wallet */}
        {mounted && address ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#16161f] border border-white/[0.08] shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    openForConnect();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  Manage Wallet
                </button>
                <button
                  onClick={() => {
                    disconnect();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openForConnect}
            className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
