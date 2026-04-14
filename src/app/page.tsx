"use client";

import Link from "next/link";

const FEATURES = [
  {
    title: "AI-Automated Decisions",
    desc: "Claude Agent SDK orchestrates risk analysis, yield optimization, and gas estimation with three specialized subagents working in parallel.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "Multi-Dimensional Analysis",
    desc: "Comprehensive evaluation of APY, risk scores, liquidity depth, collateral quality, and gas costs across Ethereum and Base vaults.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5L12 12m0 0l3 1.5M12 12V6.75" />
      </svg>
    ),
  },
  {
    title: "One-Click Execution",
    desc: "Atomic cross-vault rebalancing via ERC-4626 withdrawals and LI.FI Composer deposits — no manual multi-step transactions.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "MCP Tool Architecture",
    desc: "Two in-process MCP servers (morpho-tools, lifi-tools) enable token-efficient, on-demand data fetching instead of prompt stuffing.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
    ),
  },
];

const STACK = [
  { label: "Claude Agent SDK", desc: "AI orchestration" },
  { label: "Morpho GraphQL", desc: "Vault data" },
  { label: "LI.FI Earn + Composer", desc: "Discovery & execution" },
  { label: "Next.js 16", desc: "App framework" },
  { label: "wagmi + viem", desc: "Wallet & blockchain" },
  { label: "shadcn/ui", desc: "UI components" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative max-w-[1200px] mx-auto px-6 pt-32 pb-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-xs font-mono text-white/50">
              DeFi Mullet Hackathon #1 &mdash; AI x Earn Track
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            AI-Powered Yield
            <br />
            Optimization
            <br />
            for <span className="text-[var(--pink)]">Morpho</span> Vaults
          </h1>

          <p className="mt-6 text-lg text-white/45 max-w-xl leading-relaxed">
            MorphoClaude replaces manual vault optimization with multi-agent AI analysis.
            Three specialized subagents evaluate risk, yield, and gas costs in parallel
            — then execute optimal rebalancing in one click.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 mt-10">
            <Link
              href="/dashboard"
              className="btn-gradient rounded-xl px-8 py-3.5 text-sm font-semibold inline-block"
            >
              Launch App
            </Link>
            <Link
              href="/vaults"
              className="btn-outline-glow rounded-xl px-8 py-3.5 text-sm font-semibold text-white/70 hover:text-white inline-block"
            >
              Explore Vaults
            </Link>
          </div>
        </div>

        {/* Architecture mini-diagram (right side decoration on desktop) */}
        <div className="hidden lg:block absolute top-36 right-0 w-[340px]">
          <div className="glass-card rounded-2xl p-5 text-xs font-mono space-y-2 text-white/30">
            <p className="text-white/60 text-sm font-sans font-semibold mb-3">Agent Architecture</p>
            <p className="text-white/60">Orchestrator</p>
            <p className="pl-3">├─ MCP: morpho-tools</p>
            <p className="pl-3">├─ MCP: lifi-tools</p>
            <p className="pl-3">├─ <span className="text-[#06b6d4]">risk-analyzer</span></p>
            <p className="pl-3">├─ <span className="text-[#f59e0b]">yield-optimizer</span></p>
            <p className="pl-3">└─ <span className="text-[#10b981]">gas-estimator</span></p>
            <div className="border-t border-white/[0.06] pt-2 mt-2">
              <p className="text-white/40">Structured JSON Output</p>
              <p className="text-white/40">→ Execution Layer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="border-t border-white/[0.06] pt-16">
          <h2 className="section-label mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.10] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 mb-4 group-hover:text-white/70 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="border-t border-white/[0.06] pt-16">
          <h2 className="section-label mb-10">
            Built with
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STACK.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-center hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
              >
                <p className="text-sm font-semibold text-white/80">{s.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
        <div className="pt-16 text-center">
          <div className="divider-gradient mb-16" />
          <p className="text-sm text-white/30 mb-6">
            Connect your wallet to view positions, or explore with the demo wallet
          </p>
          <Link
            href="/dashboard"
            className="btn-gradient rounded-xl px-10 py-4 text-sm font-semibold inline-block"
          >
            Enter Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
