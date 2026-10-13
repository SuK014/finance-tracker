"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

type MonthData = { month: number; year: number; income: number; expense: number; net: number }

export default function MonthlyReportChart({ data }: { data: MonthData[] }) {
  const chartData = data.map(m => ({
    name: MONTH_NAMES[m.month - 1],
    Income: m.income,
    Expenses: m.expense,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          formatter={(value, name) => [`฿${Number(value).toLocaleString()}`, String(name)]}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px" }}
          cursor={{ fill: "var(--border)", opacity: 0.5 }}
        />
        <Legend wrapperStyle={{ fontSize: "13px" }} />
        <Bar dataKey="Income"   fill="var(--income)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="var(--expense)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
