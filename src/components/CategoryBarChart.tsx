"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

const PALETTE = ["#3b62e0", "#e0803b", "#1f8f5f", "#c99a2e", "#c75f96", "#4a9d4a", "#6a5acd", "#c7433b"]

type CategoryData = { name: string; value: number }

export default function CategoryBarChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No categorized expenses this month.</p>
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={72}
          outerRadius={108}
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
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: "11px", fill: "var(--text-secondary)" }}
        >
          Total
        </text>
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="num"
          style={{ fontSize: "16px", fontWeight: 700, fill: "var(--text-primary)" }}
        >
          ฿{total.toLocaleString()}
        </text>

        <Tooltip
          formatter={(value) => [`฿${Number(value).toLocaleString()}`, "Spending"]}
          contentStyle={{ background: "var(--surface)", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-primary)" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
          formatter={(value, entry: any) =>
            `${value} · ฿${Number(entry.payload.value).toLocaleString()}`
          }
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
