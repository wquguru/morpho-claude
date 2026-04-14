"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];

interface AllocationDataItem {
  name: string;
  value: number;
  apy?: number;
  balanceUsd?: number;
  chainId?: number;
  assetSymbol?: string;
}

interface AllocationChartProps {
  type: "current" | "recommended";
  data?: AllocationDataItem[];
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AllocationDataItem;
  return (
    <div className="rounded-xl bg-[#14141f] border border-white/[0.08] p-3.5 shadow-2xl text-sm space-y-1.5 max-w-[220px] backdrop-blur-xl">
      <p className="font-semibold text-white truncate">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-white/40">Allocation</span>
        <span className="font-medium text-white">{d.value}%</span>
      </div>
      {d.balanceUsd != null && d.balanceUsd > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-white/40">Value</span>
          <span className="font-medium text-white">
            ${d.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}
      {d.apy != null && d.apy > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-white/40">APY</span>
          <span className="font-medium bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] bg-clip-text text-transparent">{d.apy.toFixed(2)}%</span>
        </div>
      )}
      {d.chainId != null && (
        <div className="flex justify-between gap-4">
          <span className="text-white/40">Chain</span>
          <span className="font-medium text-white">{CHAIN_NAMES[d.chainId] ?? d.chainId}</span>
        </div>
      )}
      {d.assetSymbol && (
        <div className="flex justify-between gap-4">
          <span className="text-white/40">Asset</span>
          <span className="font-medium text-white">{d.assetSymbol}</span>
        </div>
      )}
    </div>
  );
}

export function AllocationChart({ type, data }: AllocationChartProps) {
  const title = type === "current" ? "Current Allocation" : "Recommended Allocation";

  const placeholder: AllocationDataItem[] = [
    { name: "No Data", value: 100 },
  ];

  const chartData = data && data.length > 0 ? data : placeholder;
  const hasData = data && data.length > 0;

  return (
    <div className="h-full glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="none"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={hasData ? COLORS[index % COLORS.length] : "rgba(255,255,255,0.06)"}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {hasData && (
            <Legend
              formatter={(value) => (
                <span className="text-xs text-white/50">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
