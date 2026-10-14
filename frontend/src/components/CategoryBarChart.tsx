"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const PALETTE = ["#6a5ae0", "#ff9a7d", "#5cb8f0", "#2fb585", "#f2c14e", "#c76bd1", "#8d9bff", "#ef6f6c"]

type CategoryData = { name: string; value: number }

export default function CategoryBarChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No categorized expenses this month.</p>
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={2}
          stroke="var(--surface)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>

        {/* Center total label */}
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: "11px", fill: "var(--text-secondary)" }}
        >
          Total
        </text>
        <text
          x="50%"
          y="55%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="num"
          style={{ fontSize: "16px", fontWeight: 700, fill: "var(--text-primary)" }}
        >
          ฿{total.toLocaleString()}
        </text>

        <Tooltip
          formatter={(value) => [`฿${Number(value).toLocaleString()}`, "Spending"]}
          contentStyle={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-primary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
    {/* Own legend below the chart (the built-in one is positioned over the donut) */}
    <div className="donut-legend">
      {data.map((d, i) => (
        <div key={d.name} className="donut-legend-item">
          <span className="donut-dot" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
          <span className="donut-name">{d.name}</span>
          <span className="num donut-val">฿{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
    </div>
  )
}
