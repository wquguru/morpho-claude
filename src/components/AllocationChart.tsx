"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#FC74FE", "#21C95E", "#FFBF17", "#3b82f6", "#f97316"];

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
    <div className="rounded-2xl bg-[#242424] border border-white/10 p-3 shadow-lg text-sm space-y-1.5 max-w-[220px]">
      <p className="font-semibold text-white truncate">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-white/55">Allocation</span>
        <span className="font-medium text-white">{d.value}%</span>
      </div>
      {d.balanceUsd != null && d.balanceUsd > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-white/55">Value</span>
          <span className="font-medium text-white">
            ${d.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}
      {d.apy != null && d.apy > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-white/55">APY</span>
          <span className="font-medium text-[#21C95E]">{d.apy.toFixed(2)}%</span>
        </div>
      )}
      {d.chainId != null && (
        <div className="flex justify-between gap-4">
          <span className="text-white/55">Chain</span>
          <span className="font-medium text-white">{CHAIN_NAMES[d.chainId] ?? d.chainId}</span>
        </div>
      )}
      {d.assetSymbol && (
        <div className="flex justify-between gap-4">
          <span className="text-white/55">Asset</span>
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
    <div className="h-full rounded-3xl bg-[#1F1F1F] border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
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
                fill={hasData ? COLORS[index % COLORS.length] : "#393939"}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {hasData && (
            <Legend
              formatter={(value) => (
                <span className="text-xs text-white/65">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
