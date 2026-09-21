"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Dot,
} from "recharts"

type DayData = { date: string; income: number; expense: number }

const INCOME  = "var(--income)"
const EXPENSE = "var(--expense)"

export default function DailyActivityChart({ data }: { data: DayData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `฿${Number(v).toLocaleString()}`}
        />
        <Tooltip
          formatter={(value, name) => [`฿${Number(value).toLocaleString()}`, name]}
          contentStyle={{ background: "var(--surface)", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-primary)" }}
        />
        <Legend wrapperStyle={{ fontSize: "13px" }} />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke={INCOME}
          strokeWidth={2}
          dot={<Dot r={3} />}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          name="Expense"
          stroke={EXPENSE}
          strokeWidth={2}
          dot={<Dot r={3} />}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
